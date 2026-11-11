import { Database } from "bun:sqlite";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
	generationRevenueGroups,
	revenueImport,
} from "./ad-revenue-import.mjs";

const DAY = 86_400_000;
export function revenueWindow(now = Date.now()) {
	const today = new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);
	const end = Date.parse(`${today}T00:00:00Z`) - DAY;
	return {
		start: new Date(end - 6 * DAY).toISOString().slice(0, 10),
		end: new Date(end).toISOString().slice(0, 10),
	};
}
function dateValue(day) {
	assert(
		typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day),
		"Invalid report date",
	);
	const at = Date.parse(`${day}T00:00:00Z`);
	assert(
		Number.isFinite(at) && new Date(at).toISOString().slice(0, 10) === day,
		"Invalid report date",
	);
	return at;
}
export function syncRevenue(
	db,
	input,
	{ start, end, apply = false, fetchedAt = Date.now() },
) {
	const from = dateValue(start),
		to = dateValue(end);
	assert(from <= to && to - from < 31 * DAY, "Use a window of at most 31 days");
	assert(
		end < new Date(fetchedAt + 9 * 3_600_000).toISOString().slice(0, 10),
		"Only completed KST days may be imported",
	);
	const report = revenueImport(input, fetchedAt);
	assert(
		report.coverage.length > 0,
		"No matching generation groups; refuse an unrelated report",
	);
	for (const row of report.records)
		assert(
			row.day >= start && row.day <= end,
			"Report row outside requested window",
		);
	const configured = db
		.query(
			"SELECT group_id, variant FROM ait_lotto_generation_ad_groups WHERE experiment='generation-cadence-v4'",
		)
		.all();
	assert(
		configured.length === 4 &&
			configured.every(
				(g) => generationRevenueGroups.get(g.group_id) === g.variant,
			),
		"Database group mapping differs from the reviewed mapping",
	);
	const expected = ((to - from) / DAY + 1) * 4;
	const result = {
		start,
		end,
		fetchedAt,
		reportedRows: report.rows,
		expectedGroupDays: expected,
		missingGroupDays: expected - report.rows,
		applied: apply,
	};
	if (!apply) return result;
	const digest = createHash("sha256")
		.update(JSON.stringify([start, end, fetchedAt, report.records]))
		.digest("hex");
	db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000");
	db.transaction(() => {
		const upsert = db.prepare(
			"INSERT INTO ait_lotto_ad_revenue_daily(report_day,group_id,impressions,estimated_revenue_krw,imported_at) VALUES(?,?,?,?,?) ON CONFLICT(report_day,group_id) DO UPDATE SET impressions=excluded.impressions,estimated_revenue_krw=excluded.estimated_revenue_krw,imported_at=excluded.imported_at WHERE excluded.imported_at>=ait_lotto_ad_revenue_daily.imported_at",
		);
		for (const r of report.records)
			upsert.run(r.day, r.groupId, r.impressions, r.revenue, fetchedAt);
		db.query(
			"INSERT OR IGNORE INTO ait_lotto_ad_revenue_syncs(run_id,start_day,end_day,fetched_at,reported_rows,missing_group_days) VALUES(?,?,?,?,?,?)",
		).run(digest, start, end, fetchedAt, report.rows, result.missingGroupDays);
		db.query("DELETE FROM ait_lotto_ad_revenue_syncs WHERE fetched_at<?").run(
			fetchedAt - 90 * DAY,
		);
	})();
	return result;
}

async function main() {
	const args = process.argv.slice(2),
		options = {};
	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--apply") options.apply = true;
		else {
			assert(
				[
					"--input",
					"--database",
					"--start",
					"--end",
					"--fetched-at",
					"--ssh-target",
					"--container",
				].includes(args[i]),
				"Unknown option",
			);
			assert(
				args[i + 1] && !args[i + 1].startsWith("--"),
				"Missing option value",
			);
			options[args[i].slice(2)] = args[++i];
		}
	}
	assert(
		options.input,
		"Use --input report.json (or - for stdin). Dry run is the default; --apply writes only verified report rows.",
	);
	const text = readFileSync(options.input === "-" ? 0 : options.input, "utf8");
	assert(Buffer.byteLength(text) <= 2_000_000, "Report too large");
	const input = JSON.parse(text),
		window = revenueWindow();
	const start = options.start ?? window.start,
		end = options.end ?? window.end;
	const fetchedAt = options["fetched-at"]
		? Number(options["fetched-at"])
		: Date.now();
	if (options["ssh-target"]) {
		assert(
			/^[a-zA-Z0-9_][a-zA-Z0-9_.@-]*$/.test(options["ssh-target"]),
			"Invalid SSH target",
		);
		assert(
			/^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/.test(options.container ?? ""),
			"Invalid container",
		);
		dateValue(start);
		dateValue(end);
		assert(Number.isSafeInteger(fetchedAt) && fetchedAt > 0);
		const remote = `docker exec -i ${options.container} bun /app/operations/ad-revenue-sync.mjs --database /app/traildepot/data/main.db --input - --start ${start} --end ${end} --fetched-at ${fetchedAt}${options.apply ? " --apply" : ""}`;
		const run = spawnSync(
			"ssh",
			[
				"-o",
				"BatchMode=yes",
				"-o",
				"ConnectTimeout=10",
				options["ssh-target"],
				remote,
			],
			{
				input: JSON.stringify(input),
				encoding: "utf8",
				timeout: 30_000,
				maxBuffer: 100_000,
			},
		);
		assert(
			!run.error && run.status === 0,
			`Revenue synchronization failed: ${run.error?.message ?? run.stderr}`,
		);
		console.log(run.stdout.trim());
		return;
	}
	assert(options.database, "Use --database or --ssh-target with --container");
	const db = new Database(options.database, {
		readonly: !options.apply,
		create: false,
	});
	try {
		console.log(
			JSON.stringify(
				syncRevenue(db, input, {
					start,
					end,
					apply: Boolean(options.apply),
					fetchedAt,
				}),
			),
		);
	} finally {
		db.close();
	}
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
	await main();

import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const groups = new Map([
	["ait.v2.live.7700cddda6e84a37", "control"],
	["ait.v2.live.74d57d445b6d4fd9", "control"],
	["ait.v2.live.af3e69b0e59d48d8", "short"],
	["ait.v2.live.14e80579edd44ee2", "short"],
]);

/** Accept the console iaa_placement_group_list result, never SDK-estimated income. */
export function revenueImport(input, importedAt = Date.now()) {
	assert(Array.isArray(input), "Expected the console group report array");
	assert(Number.isSafeInteger(importedAt) && importedAt > 0);
	const seen = new Set();
	const rows = [];
	const coverage = [];
	for (const group of input) {
		if (!groups.has(group.groupId)) continue;
		assert(!seen.has(group.groupId), "Duplicate group");
		seen.add(group.groupId);
		const days = group.report?.dailyReports;
		coverage.push({
			groupId: group.groupId,
			variant: groups.get(group.groupId),
			reportedDays: Array.isArray(days) ? days.length : null,
		});
		if (days == null) continue; // Null is unknown, not zero revenue.
		assert(Array.isArray(days));
		const uniqueDays = new Set();
		for (const day of days) {
			assert(/^\d{4}-\d{2}-\d{2}$/.test(day.date));
			assert(
				new Date(`${day.date}T00:00:00Z`).toISOString().slice(0, 10) ===
					day.date,
			);
			assert(!uniqueDays.has(day.date), "Duplicate report day");
			uniqueDays.add(day.date);
			assert(Number.isSafeInteger(day.impression) && day.impression >= 0);
			assert(
				Number.isFinite(day.estimatedEarning) && day.estimatedEarning >= 0,
			);
			rows.push(
				`('${day.date}','${group.groupId}',${day.impression},${day.estimatedEarning},${importedAt})`,
			);
		}
	}
	const sql = rows.length
		? `-- Apps in Toss estimated KRW; missing dates/groups remain unknown.\nINSERT INTO ait_lotto_ad_revenue_daily(report_day,group_id,impressions,estimated_revenue_krw,imported_at) VALUES\n${rows.join(",\n")}\nON CONFLICT(report_day,group_id) DO UPDATE SET impressions=excluded.impressions,estimated_revenue_krw=excluded.estimated_revenue_krw,imported_at=excluded.imported_at WHERE excluded.imported_at>=ait_lotto_ad_revenue_daily.imported_at;\n`
		: "-- No reported daily rows. Do not replace missing reports with zero.\nSELECT '광고 수익 집계 대기' AS 상태;\n";
	return { sql, rows: rows.length, coverage };
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	const [, , inputFile, outputFile] = process.argv;
	assert(
		inputFile && outputFile,
		"Usage: bun scripts/miniapp/ad-revenue-import.mjs console-groups.json import.sql",
	);
	const { sql, ...result } = revenueImport(
		JSON.parse(readFileSync(inputFile, "utf8")),
	);
	writeFileSync(outputFile, sql);
	console.log(JSON.stringify(result));
}

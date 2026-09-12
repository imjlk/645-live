import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const tables = [
	["lotto_draw_results", "round"],
	["lotto_number_stats", "last_draw_round"],
	["lotto_number_pair_stats", "updated_at"],
	["lotto_bonus_number_stats", "last_bonus_round"],
	...[
		"ac",
		"bonus",
		"color",
		"high_low",
		"odd_even",
		"repeat",
		"section",
		"unit_digit",
	].map((name) => [`lotto_draw_${name}_stats`, "round"]),
];

export function salesRound(now = new Date()) {
	const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
	const weeks = Math.floor(
		(kst.getTime() - Date.parse("2002-12-07T00:00:00Z")) / 604800000,
	);
	return 1 + weeks + (kst.getUTCDay() === 6 ? 0 : 1);
}

export async function getPublicDataRevision(
	baseURL,
	fetcher = fetch,
	now = new Date(),
) {
	const result = {};
	// Limit build/refresh load on the public origin; these endpoints contain no member data.
	for (let i = 0; i < tables.length; i += 3) {
		await Promise.all(
			tables.slice(i, i + 3).map(async ([name, order]) => {
				const url = new URL(`/api/records/v1/${name}`, baseURL);
				url.search = new URLSearchParams({
					limit: "1",
					order: `-${order}`,
				}).toString();
				const response = await fetcher(url, {
					signal: AbortSignal.timeout(15000),
					headers: { Accept: "application/json" },
				});
				if (!response.ok)
					throw new Error(
						`Public SSG source ${name} returned ${response.status}`,
					);
				const { records } = await response.json();
				if (!Array.isArray(records) || records.length === 0)
					throw new Error(`Public SSG source ${name} is empty`);
				const row = records[0];
				if (name === "lotto_draw_results") {
					const numbers = [1, 2, 3, 4, 5, 6].map(
						(n) => row[`draw_number_${n}`],
					);
					if (
						!Number.isInteger(row.round) ||
						new Set(numbers).size !== 6 ||
						!numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 45)
					)
						throw new Error("Published draw is incomplete");
				}
				result[name] = row;
			}),
		);
	}
	const latestRound = result.lotto_draw_results.round;
	for (const [table, field] of tables) {
		if (field === "round" && Number(result[table][field]) !== latestRound)
			throw new Error(
				`${table} has not caught up to round ${latestRound}; keep the previous deployment`,
			);
	}
	const sources = Object.fromEntries(
		Object.keys(result)
			.sort()
			.map((key) => [key, result[key]]),
	);
	return {
		schemaVersion: 1,
		latestRound,
		salesRound: salesRound(now),
		drawDate: result.lotto_draw_results.draw_date,
		revision: createHash("sha256")
			.update(JSON.stringify(sources))
			.digest("hex"),
	};
}

async function main() {
	const revision = await getPublicDataRevision(
		process.env.TRAILBASE_URL || "https://trail.645.live",
	);
	if (process.argv.includes("--write")) {
		const filename = new URL(
			"../../pages/www/src/lib/generated/public-data-revision.json",
			import.meta.url,
		);
		const next = `${JSON.stringify(revision, null, 2)}\n`;
		const previous = await readFile(filename, "utf8").catch(() => "");
		if (next !== previous) {
			await mkdir(new URL(".", filename), { recursive: true });
			await writeFile(filename, next);
			console.log(
				`[ssg] Public data revision changed: draw ${revision.latestRound}, sales ${revision.salesRound}`,
			);
		} else console.log("[ssg] Public data revision is unchanged");
	} else
		console.log(
			`[ssg] Sources ready: draw ${revision.latestRound}, sales ${revision.salesRound}`,
		);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main().catch((error) => {
		console.error(`[ssg] ${error.message}`);
		process.exitCode = 1;
	});
}

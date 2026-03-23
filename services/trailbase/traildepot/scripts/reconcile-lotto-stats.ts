import { executeLottoStatsReconcile } from "../lotto-stats-reconcile.ts";

async function main() {
	const force = process.argv.includes("--force");
	const result = await executeLottoStatsReconcile(force);

	console.log(
		`[reconcile] rebuilt=${result.rebuilt} latest_round=${result.latestDrawRound} draw_count=${result.drawCount}`,
	);

	if (result.staleSources.length > 0) {
		console.log(`[reconcile] stale_sources=${result.staleSources.join(", ")}`);
	}
}

main().catch((error) => {
	console.error("[reconcile] failed", error);
	process.exitCode = 1;
});

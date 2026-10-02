import {
	type ActivitySnapshot,
	fetchActivityInsights,
	parseActivitySnapshot,
} from "@645/lotto-core";
import { initClient } from "trailbase";
import { TRAILBASE_URL } from "$env/static/private";
import { getGenerationPreview } from "./generation-preview";
export async function getActivityPreview(
	requestedRound?: number,
): Promise<ActivitySnapshot | null> {
	const base = (TRAILBASE_URL || "http://localhost:4000").replace(/\/$/, "");
	try {
		return await fetchActivityInsights(base, { round: requestedRound });
	} catch {}
	try {
		// Publish useful static rankings even before the aggregate API is deployed.
		const preview = await getGenerationPreview();
		if (!preview.context) return null;
		const round = requestedRound ?? preview.context.targetRound;
		let feed = preview.feed;
		if (round !== preview.context.targetRound)
			try {
				const r = await fetch(`${base}/api/app/v1/lotto/feed?round=${round}`, {
					signal: AbortSignal.timeout(8000),
				});
				feed = r.ok ? await r.json() : null;
			} catch {
				feed = null;
			}
		if (!feed) return null;
		let scan: Record<string, unknown> | null = null;
		try {
			const result = await initClient(base)
				.records("lotto_draw_scan_counts")
				.list({
					filters: [{ column: "round", op: "equal", value: String(round) }],
					pagination: { limit: 1 },
				});
			scan = (result.records[0] as Record<string, unknown>) ?? null;
		} catch {
			return null;
		}
		const empty = {
			previousCounts: Array(45).fill(0),
			rounds: [],
			patterns: {
				combinations: 0,
				oddCounts: Array(7).fill(0),
				sumCounts: Array(14).fill(0),
				withConsecutive: 0,
				since: null,
			},
			pairs: [],
			hours: [],
		};
		return parseActivitySnapshot({
			round,
			currentRound: preview.context.targetRound,
			period: "round",
			updatedAt: preview.context.serverTime,
			draw: null,
			knownRounds: [round],
			sources: {
				generated: {
					...empty,
					source: "generated",
					records: feed?.totalGenerations ?? 0,
					numberCounts: feed?.numberCounts ?? Array(45).fill(0),
				},
				scanned: {
					...empty,
					source: "scanned",
					records: Number(scan?.total_scans ?? 0),
					numberCounts: Array.from({ length: 45 }, (_, i) =>
						Number(scan?.[`scan_count_${i + 1}`] ?? 0),
					),
				},
			},
		});
	} catch {
		// Optional activity data must not suppress an otherwise valid draw.
		return null;
	}
}

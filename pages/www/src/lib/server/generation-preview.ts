import type { Feed, RoundContext } from "@645/lotto-core";
import { TRAILBASE_URL } from "$env/static/private";

export type GenerationPreview = {
	context: RoundContext | null;
	feed: Feed | null;
};
export async function getGenerationPreview(): Promise<GenerationPreview> {
	try {
		const base = (TRAILBASE_URL || "http://localhost:4000").replace(/\/$/, "");
		const response = await fetch(`${base}/api/app/v1/lotto/round-context`, {
			signal: AbortSignal.timeout(8000),
		});
		if (!response.ok) throw new Error("Round unavailable");
		const context = (await response.json()) as RoundContext;
		if (!Number.isSafeInteger(context.targetRound))
			throw new Error("Invalid round");
		const feedResponse = await fetch(
			`${base}/api/app/v1/lotto/feed?round=${context.targetRound}`,
			{ signal: AbortSignal.timeout(8000) },
		);
		const feed = feedResponse.ok ? ((await feedResponse.json()) as Feed) : null;
		return { context, feed };
	} catch {
		return { context: null, feed: null };
	}
}

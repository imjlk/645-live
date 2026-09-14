import { building } from "$app/environment";
import { getGenerationPreview } from "$lib/server/generation-preview";
export const prerender = "auto";

import {
	getAgentHomePageContent,
	getHomePageContent,
} from "$lib/agent/content";
import { getAllNewsPosts } from "$lib/server/news";
import { getScanPreviewState } from "$lib/server/scan-preview";
import {
	calculateDisplayRound,
	getLatestLottoRound,
	getLottoNumbers,
} from "$lib/utils/lotto-api";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
	const displayRound = calculateDisplayRound();
	const [latestInfo, scanPreview, generationPreview] = await Promise.all([
		getLatestLottoRound().catch(() => null),
		getScanPreviewState(displayRound),
		getGenerationPreview(),
	]);
	const latestDraw = latestInfo
		? await getLottoNumbers(latestInfo.drwNo).catch(() => null)
		: null;
	if (building && !latestDraw)
		throw new Error("Cannot prerender home without a published draw");
	return {
		generationPreview,
		latestDraw,
		latestRound: latestDraw?.drwNo ?? latestInfo?.drwNo ?? displayRound,
		latestRoundDate: latestDraw?.drwNoDate ?? null,
		displayRound,
		agentMode: !building && url.searchParams.get("mode") === "agent",
		landingPage: getHomePageContent(),
		agentPage: getAgentHomePageContent(),
		newsPosts: getAllNewsPosts().slice(0, 3),
		...scanPreview,
	};
};

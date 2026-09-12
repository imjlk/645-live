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
	const [latestInfo, scanPreview] = await Promise.all([
		getLatestLottoRound().catch(() => null),
		getScanPreviewState(displayRound),
	]);
	const latestDraw = latestInfo
		? await getLottoNumbers(latestInfo.drwNo).catch(() => null)
		: null;
	return {
		latestDraw,
		latestRound: latestDraw?.drwNo ?? latestInfo?.drwNo ?? displayRound,
		latestRoundDate: latestDraw?.drwNoDate ?? null,
		displayRound,
		agentMode: url.searchParams.get("mode") === "agent",
		landingPage: getHomePageContent(),
		agentPage: getAgentHomePageContent(),
		newsPosts: getAllNewsPosts().slice(0, 3),
		...scanPreview,
	};
};

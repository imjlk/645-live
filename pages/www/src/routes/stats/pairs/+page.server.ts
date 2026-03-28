import { getLatestRoundInfo, getPairsAnalysis } from "$lib/trailbase/stats";
import type { PageServerLoad } from "./$types";

// SSR 사용으로 변경 (실시간 데이터 반영)
export const prerender = false;

export const load: PageServerLoad = async () => {
	try {
		const [result, latestRoundInfo] = await Promise.all([
			getPairsAnalysis(),
			getLatestRoundInfo(),
		]);

		return {
			...result,
			totalRounds: latestRoundInfo?.round || 0,
		};
	} catch (error) {
		console.error("번호 쌍 통계 데이터 로드 실패:", error);
		return {
			pairStats: [],
			totalPairs: 0,
			maxPairCount: 0,
			minPairCount: 0,
			averagePairCount: "0.00",
			topNumbersByPairCount: [],
			pairCountDistribution: {},
			totalRounds: 0,
		};
	}
};

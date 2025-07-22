import { getPairsAnalysis } from "$lib/trailbase/stats";
import type { PageServerLoad } from "./$types";

// 정적 페이지이므로 prerender 사용
export const prerender = true;

export const load: PageServerLoad = async () => {
	try {
		return await getPairsAnalysis();
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

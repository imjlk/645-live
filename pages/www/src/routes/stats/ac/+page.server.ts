import { getACAnalysis } from "$lib/trailbase/stats";
import type { PageServerLoad } from "./$types";

// SSR 사용으로 변경 (실시간 데이터 반영)
export const prerender = false;

export const load: PageServerLoad = async () => {
	try {
		const result = await getACAnalysis();

		return result;
	} catch (error) {
		console.error("AC값 통계 데이터 로드 실패:", error);
		return {
			acStats: [],
			totalRecords: 0,
			averageAcValue: 0,
			mostFrequentAc: [0, 0],
			minAcValue: 0,
			maxAcValue: 0,
			acDistribution: {},
			acRangeDistribution: {},
			lowComplexityRate: "0.0",
			highComplexityRate: "0.0",
			recentStats: [],
			totalRounds: 0,
		};
	}
};

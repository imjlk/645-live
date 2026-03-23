import { getACAnalysis } from "$lib/trailbase/stats";
import { getSingleStatsFreshness } from "$lib/trailbase/stats-freshness";
import type { PageServerLoad } from "./$types";

// SSR 사용으로 변경 (실시간 데이터 반영)
export const prerender = false;

export const load: PageServerLoad = async () => {
	try {
		const [result, freshness] = await Promise.all([
			getACAnalysis(),
			getSingleStatsFreshness({
				tableName: "lotto_draw_ac_stats",
				sourceLabel: "AC 통계",
			}),
		]);

		return {
			...result,
			freshness,
		};
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
			freshness: {
				latestRound: 0,
				latestDrawDate: "",
				analysisRound: 0,
				isStale: false,
				lastUpdatedAt: null,
				sourceLabel: "AC 통계",
			},
		};
	}
};

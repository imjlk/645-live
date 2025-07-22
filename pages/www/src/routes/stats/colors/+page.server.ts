import {
	getColorAveragesAndDistribution,
	getLatestRoundInfo,
	getRecentColorStats,
} from "$lib/trailbase/stats";
import type { PageServerLoad } from "./$types";

// 페이지 옵션 설정 - 정적 페이지이므로 prerender 사용
export const prerender = true;

export const load: PageServerLoad = async ({ url }) => {
	try {
		// 최신 회차 정보와 색상 분석 데이터를 병렬로 가져오기
		const [latestRoundInfo, colorAnalysisData, recentStats] = await Promise.all(
			[
				getLatestRoundInfo(),
				getColorAveragesAndDistribution(),
				getRecentColorStats(10),
			],
		);

		const totalRounds = latestRoundInfo?.round || 0;

		return {
			totalRounds,
			recentStats,
			...colorAnalysisData,
		};
	} catch (error) {
		console.error("색깔별 통계 데이터 로드 실패:", error);
		return {
			colorStats: [],
			colorDistribution: {},
			colorCountDistribution: {},
			colorAverages: {},
			mostFrequentColor: ["yellow", "0.00"] as [string, string],
			totalRecords: 0,
			totalRounds: 0,
			recentStats: [],
			lowComplexityRate: "0.0",
			highComplexityRate: "0.0",
		};
	}
};

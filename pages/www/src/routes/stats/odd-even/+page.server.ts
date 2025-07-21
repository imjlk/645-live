import {
	getLatestRoundInfo,
	getOddEvenAnalysis,
	getRecentOddEvenStats,
} from "$lib/trailbase/stats";
import type { PageServerLoad } from "./$types";

// 페이지 옵션 설정 - 정적 페이지이므로 prerender 사용
export const prerender = true;

export const load: PageServerLoad = async () => {
	try {
		// 최신 회차 정보와 홀짝 분석 데이터를 병렬로 가져오기
		const [latestRoundInfo, oddEvenAnalysisData, recentStats] = await Promise.all([
			getLatestRoundInfo(),
			getOddEvenAnalysis(),
			getRecentOddEvenStats(10),
		]);

		const totalRounds = latestRoundInfo?.round || 0;

		return {
			totalRounds,
			recentStats,
			...oddEvenAnalysisData,
		};
	} catch (error) {
		console.error("홀짝 통계 데이터 로드 실패:", error);
		return {
			oddEvenStats: [],
			totalRounds: 0,
			totalRecords: 0,
			oddEvenDistribution: {},
			sumDistribution: {},
			averageOddCount: "0.00",
			averageEvenCount: "0.00",
			mostFrequentPattern: ["3", 0] as [string, number],
			recentStats: [],
			balancedRate: "0.0",
			extremeRate: "0.0",
		};
	}
};

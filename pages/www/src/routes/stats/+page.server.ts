import {
	getLatestRoundInfo,
	getNumberStats,
	getPairStats,
	getRecentColorStats,
	getRecentOddEvenStats,
	getStatsForAnalysisType,
} from "$lib/trailbase/stats";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	try {
		// 최신 회차 정보 가져오기
		const latestRoundInfo = await getLatestRoundInfo();
		const latestRound = latestRoundInfo?.round || 0;
		const latestDrawDate = latestRoundInfo?.draw_date || "";

		// 전체 회차 수 - 최신 회차 번호를 사용
		const totalRounds = latestRound;

		// 병렬로 데이터 가져오기
		const [
			topNumberStats,
			bottomNumberStats,
			recentOddEvenStats,
			recentColorStats,
			recentSectionStats,
			recentHighLowStats,
			topPairStats,
		] = await Promise.all([
			getNumberStats("desc", 10),
			getNumberStats("asc", 10),
			getRecentOddEvenStats(10),
			getRecentColorStats(10),
			getStatsForAnalysisType("sections", 10),
			getStatsForAnalysisType("high-low", 10),
			getPairStats(10),
		]);

		return {
			latestRound,
			latestDrawDate,
			totalRounds,
			topNumberStats,
			bottomNumberStats,
			recentOddEvenStats,
			recentColorStats,
			recentSectionStats,
			recentHighLowStats,
			topPairStats,
		};
	} catch (error) {
		console.error("통계 데이터 로드 실패:", error);
		return {
			latestRound: 0,
			latestDrawDate: "",
			totalRounds: 0,
			topNumberStats: [],
			bottomNumberStats: [],
			recentOddEvenStats: [],
			recentColorStats: [],
			recentSectionStats: [],
			recentHighLowStats: [],
			topPairStats: [],
		};
	}
};

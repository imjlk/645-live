import { getAnalysisWithRecent } from "$lib/trailbase/stats";
import type { PageServerLoad } from "./$types";

// 정적 페이지이므로 prerender 사용
export const prerender = true;

export const load: PageServerLoad = async () => {
	try {
		const result = await getAnalysisWithRecent("high-low");
		
		return {
			highLowStats: result.analysisData,
			recentStats: result.recentStats,
			totalRounds: result.totalRounds,
		};
	} catch (error) {
		console.error("고저번대 통계 데이터 로드 실패:", error);
		return {
			highLowStats: [],
			recentStats: [],
			totalRounds: 0,
		};
	}
};
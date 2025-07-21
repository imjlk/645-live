import { getAnalysisWithRecent } from "$lib/trailbase/stats";
import type { PageServerLoad } from "./$types";

// 정적 페이지이므로 prerender 사용
export const prerender = true;

export const load: PageServerLoad = async () => {
	try {
		const result = await getAnalysisWithRecent("repeat");
		
		return {
			repeatStats: result.analysisData,
			recentStats: result.recentStats,
			totalRounds: result.totalRounds,
		};
	} catch (error) {
		console.error("연속 중복 통계 데이터 로드 실패:", error);
		return {
			repeatStats: [],
			recentStats: [],
			totalRounds: 0,
		};
	}
};
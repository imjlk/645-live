import { getAnalysisWithRecent } from "$lib/trailbase/stats";
import type { PageServerLoad } from "./$types";

// 페이지 옵션 설정
export const prerender = true;

export const load: PageServerLoad = async () => {
	try {
		const result = await getAnalysisWithRecent("ac");
		
		return {
			acStats: result.analysisData,
			recentStats: result.recentStats,
			totalRounds: result.totalRounds,
		};
	} catch (error) {
		console.error("AC값 통계 데이터 로드 실패:", error);
		return {
			acStats: [],
			recentStats: [],
			totalRounds: 0,
		};
	}
};
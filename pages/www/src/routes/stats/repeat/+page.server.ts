import { getRepeatAnalysis } from "$lib/trailbase/stats";
import type { PageServerLoad } from "./$types";

// SSR 사용으로 변경 (실시간 데이터 반영)
export const prerender = false;

export const load: PageServerLoad = async () => {
	try {
		const result = await getRepeatAnalysis();

		return result;
	} catch (error) {
		console.error("연속 중복 통계 데이터 로드 실패:", error);
		return {
			repeatStats: [],
			totalRecords: 0,
			averageRepeatCount: 0,
			maxRepeatCount: 0,
			repeatCountDistribution: {},
			zeroRepeatRate: "0.0",
			zeroRepeatCount: 0,
			highRepeatRate: "0.0",
			recentStats: [],
			totalRounds: 0,
		};
	}
};

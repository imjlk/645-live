import { getHighLowAnalysis } from "$lib/trailbase/stats";
import type { PageServerLoad } from "./$types";

// SSR 사용으로 변경 (실시간 데이터 반영)
export const prerender = false;

export const load: PageServerLoad = async () => {
	try {
		const result = await getHighLowAnalysis();

		if (!result || typeof result !== "object") {
			throw new Error("Invalid high-low analysis data format");
		}

		if (
			!Array.isArray(result.highLowStats) ||
			!Array.isArray(result.recentStats) ||
			typeof result.totalRounds !== "number" ||
			typeof result.totalRecords !== "number" ||
			typeof result.averageLowCount !== "number" ||
			typeof result.averageHighCount !== "number" ||
			!result.highLowDistribution ||
			!result.patternStats ||
			!Array.isArray(result.mostFrequentPattern)
		) {
			throw new Error("Missing required high-low analysis properties");
		}

		return result;
	} catch (error) {
		console.error("고저번대 통계 데이터 로드 실패:", error);
		return {
			highLowStats: [],
			totalRecords: 0,
			averageLowCount: 0,
			averageHighCount: 0,
			highLowDistribution: {
				"0": 0,
				"1": 0,
				"2": 0,
				"3": 0,
				"4": 0,
				"5": 0,
				"6": 0,
			},
			patternStats: {
				balanced: 0,
				extreme: 0,
			},
			mostFrequentPattern: ["", 0],
			recentStats: [],
			totalRounds: 0,
		};
	}
};

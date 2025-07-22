import { getUnitDigitAnalysis } from "$lib/trailbase/stats";
import type { PageServerLoad } from "./$types";

// 정적 페이지이므로 prerender 사용
export const prerender = true;

export const load: PageServerLoad = async () => {
	try {
		const result = await getUnitDigitAnalysis();

		if (!result || typeof result !== "object") {
			throw new Error("Invalid unit-digit analysis data format");
		}

		if (
			!Array.isArray(result.unitDigitStats) ||
			!Array.isArray(result.recentStats) ||
			typeof result.totalRounds !== "number" ||
			typeof result.totalRecords !== "number" ||
			!result.digitAverages ||
			!result.digitTotals ||
			!result.digitCountDistribution ||
			!Array.isArray(result.mostFrequentDigit) ||
			!Array.isArray(result.leastFrequentDigit)
		) {
			throw new Error("Missing required unit-digit analysis properties");
		}

		return result;
	} catch (error) {
		console.error("끝수 분석 통계 데이터 로드 실패:", error);
		return {
			unitDigitStats: [],
			totalRecords: 0,
			digitAverages: {
				"0": "0.00",
				"1": "0.00",
				"2": "0.00",
				"3": "0.00",
				"4": "0.00",
				"5": "0.00",
				"6": "0.00",
				"7": "0.00",
				"8": "0.00",
				"9": "0.00",
			},
			digitTotals: {
				"0": 0,
				"1": 0,
				"2": 0,
				"3": 0,
				"4": 0,
				"5": 0,
				"6": 0,
				"7": 0,
				"8": 0,
				"9": 0,
			},
			digitCountDistribution: {},
			mostFrequentDigit: [0, "0"],
			leastFrequentDigit: [0, "0"],
			recentStats: [],
			totalRounds: 0,
		};
	}
};

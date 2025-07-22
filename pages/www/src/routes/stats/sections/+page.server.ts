import { getSectionsAnalysis } from "$lib/trailbase/stats";
import type { PageServerLoad } from "./$types";

// 정적 페이지이므로 prerender 사용
export const prerender = true;

export const load: PageServerLoad = async () => {
	try {
		const result = await getSectionsAnalysis();

		if (!result || typeof result !== "object") {
			throw new Error("Invalid sections analysis data format");
		}

		if (
			!Array.isArray(result.sectionStats) ||
			!Array.isArray(result.recentStats) ||
			typeof result.totalRounds !== "number" ||
			typeof result.totalRecords !== "number" ||
			!result.sectionDistribution
		) {
			throw new Error("Missing required sections analysis properties");
		}

		return result;
	} catch (error) {
		console.error("구간별 통계 데이터 로드 실패:", error);
		return {
			sectionStats: [],
			recentStats: [],
			totalRounds: 0,
			totalRecords: 0,
			sectionDistribution: {
				section_1_10: { average: 0, total: 0 },
				section_11_20: { average: 0, total: 0 },
				section_21_30: { average: 0, total: 0 },
				section_31_40: { average: 0, total: 0 },
				section_41_45: { average: 0, total: 0 },
			},
		};
	}
};

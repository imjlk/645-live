import { getRecentUnitDigitAnalysis } from "$lib/trailbase/stats";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

// 동적 페이지이므로 SSR 사용
export const prerender = false;
export const ssr = true;

export const load: PageServerLoad = async ({ params }) => {
	try {
		const roundsParam = params.rounds;
		const selectedRounds = Number(roundsParam);

		// 유효성 검사
		if (Number.isNaN(selectedRounds) || selectedRounds < 1) {
			throw error(400, "잘못된 회차 파라미터입니다.");
		}

		const result = await getRecentUnitDigitAnalysis(selectedRounds);

		if (!result.validRounds) {
			throw error(
				400,
				`선택한 회차 수(${selectedRounds})가 전체 회차 수(${result.totalRounds})를 초과합니다.`,
			);
		}

		// 결과 데이터 검증
		if (!result || typeof result !== "object") {
			throw error(500, "Unit-digit 분석 데이터 형식이 올바르지 않습니다.");
		}

		if (
			typeof result.selectedRounds !== "number" ||
			typeof result.totalRounds !== "number" ||
			!Array.isArray(result.records) ||
			!result.summary ||
			typeof result.summary !== "object"
		) {
			throw error(500, "Unit-digit 분석 데이터의 필수 속성이 누락되었습니다.");
		}

		return {
			unitDigitStats: result,
			selectedRounds: result.selectedRounds,
			totalRounds: result.totalRounds,
			totalRecords: result.records.length,
			recentStats: result.records.slice(0, 10),
		};
	} catch (err) {
		console.error("최근 unit-digit 통계 데이터 로드 실패:", err);
		if (err instanceof Error && err.message.includes("400")) {
			throw err;
		}
		throw error(500, "데이터를 불러오는 중 오류가 발생했습니다.");
	}
};

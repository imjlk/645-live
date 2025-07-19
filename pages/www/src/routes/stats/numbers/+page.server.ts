import { env } from "$env/static/public";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.PUBLIC_TRAILBASE_URL || "http://localhost:4000");

// 페이지 옵션 설정 - 정적 페이지이므로 prerender 사용
export const prerender = true;

export const load: PageServerLoad = async () => {
	try {
		// 번호별 통계 (전체, 페이지네이션 제거)
		const numberStatsResponse = await client
			.records("lotto_number_stats")
			.list({
				order: ["-draw_count"],
				pagination: { limit: 45 }, // 모든 번호 표시
			});

		// 번호별 상세 정보 (색깔, 구간)
		const numberDetailsResponse = await client
			.records("lotto_number_details")
			.list({
				order: ["number"],
				pagination: { limit: 45 },
			});

		// 최신 회차 정보
		const latestRoundResponse = await client
			.records("lotto_draw_results")
			.list({
				order: ["-round"],
				pagination: { limit: 1 },
			});

		let latestRound = 0;
		if (latestRoundResponse.records.length > 0) {
			latestRound = (latestRoundResponse.records[0] as { round: number }).round;
		}

		// 전체 회차 수
		const totalRounds = latestRound; // 최신 회차가 전체 회차 수

		// 번호별 상세 정보 매핑
		const numberDetailsMap = new Map();
		for (const detail of numberDetailsResponse.records) {
			const detailRecord = detail as {
				number: number;
				color: string;
				section: number;
			};
			numberDetailsMap.set(detailRecord.number, detailRecord);
		}

		// 통계 데이터에 상세 정보 추가
		const enrichedStats = numberStatsResponse.records.map((stat) => {
			const statRecord = stat as {
				number: number;
				draw_count: number;
				bonus_count: number;
				last_draw_round: number;
			};
			const detail = numberDetailsMap.get(statRecord.number);
			return {
				...statRecord,
				color: detail?.color || "unknown",
				section: detail?.section || 0,
				average_frequency:
					totalRounds > 0
						? ((statRecord.draw_count / totalRounds) * 100).toFixed(2)
						: "0.00",
				expected_frequency:
					totalRounds > 0 ? ((totalRounds * 6) / 45).toFixed(1) : "0.0",
				deviation:
					totalRounds > 0
						? (statRecord.draw_count - (totalRounds * 6) / 45).toFixed(1)
						: "0.0",
			};
		});

		// 가장 많이 출현한 번호와 적게 출현한 번호
		const mostFrequentNumber =
			enrichedStats.length > 0 ? enrichedStats[0] : null;
		const leastFrequentNumber =
			enrichedStats.length > 0 ? enrichedStats[enrichedStats.length - 1] : null;

		return {
			numberStats: enrichedStats,
			totalRounds,
			latestRound,
			mostFrequentNumber,
			leastFrequentNumber,
			selectedRounds: 0, // 기본값은 0 (전체 보기)
		};
	} catch (error) {
		console.error("번호별 통계 데이터 로드 실패:", error);
		return {
			numberStats: [],
			totalRounds: 0,
			latestRound: 0,
			mostFrequentNumber: null,
			leastFrequentNumber: null,
			selectedRounds: 0,
		};
	}
};

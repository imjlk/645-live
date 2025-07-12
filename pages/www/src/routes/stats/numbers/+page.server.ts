import { env } from "$env/dynamic/private";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get("page") || "1");
	const limit = 45; // 모든 번호 표시
	const offset = (page - 1) * limit;

	try {
		// 번호별 통계 (전체)
		const numberStatsResponse = await client
			.records("lotto_number_stats")
			.list({
				order: ["-draw_count"],
				pagination: { limit, offset },
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
		const totalRoundsResponse = await client
			.records("lotto_draw_results")
			.list({
				pagination: { limit: 1 },
			});
		const totalRounds = totalRoundsResponse.total_count || 0;

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

		return {
			numberStats: enrichedStats,
			totalRounds,
			latestRound,
			currentPage: page,
			totalPages: Math.ceil((numberStatsResponse.total_count || 0) / limit),
		};
	} catch (error) {
		console.error("번호별 통계 데이터 로드 실패:", error);
		return {
			numberStats: [],
			totalRounds: 0,
			latestRound: 0,
			currentPage: 1,
			totalPages: 1,
		};
	}
};

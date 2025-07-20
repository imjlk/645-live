import { PUBLIC_TRAILBASE_URL } from "$env/static/public";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(PUBLIC_TRAILBASE_URL || "http://localhost:4000");

export const load: PageServerLoad = async () => {
	try {
		// 최신 회차 정보 가져오기
		const latestRoundResponse = await client
			.records("lotto_draw_results")
			.list({
				order: ["-round"],
				pagination: { limit: 1 },
			});

		let latestRound = 0;
		let latestDrawDate = "";
		if (latestRoundResponse.records.length > 0) {
			const latest = latestRoundResponse.records[0] as {
				round: number;
				draw_date: string;
			};
			latestRound = latest.round;
			latestDrawDate = latest.draw_date;
		}

		// 전체 회차 수 - 최신 회차 번호를 사용
		const totalRounds = latestRound;

		// 번호별 통계 (상위 10개 & 하위 10개)
		const [topNumberStats, bottomNumberStats] = await Promise.all([
			client.records("lotto_number_stats").list({
				order: ["-draw_count"],
				pagination: { limit: 10 },
			}),
			client.records("lotto_number_stats").list({
				order: ["draw_count"],
				pagination: { limit: 10 },
			}),
		]);

		// 최근 홀짝 통계 (최근 10회차)
		const recentOddEvenStats = await client
			.records("lotto_draw_odd_even_stats")
			.list({
				order: ["-round"],
				pagination: { limit: 10 },
			});

		// 최근 색깔별 통계 (최근 10회차)
		const recentColorStats = await client
			.records("lotto_draw_color_stats")
			.list({
				order: ["-round"],
				pagination: { limit: 10 },
			});

		// 구간별 통계 (최근 10회차)
		const recentSectionStats = await client
			.records("lotto_draw_section_stats")
			.list({
				order: ["-round"],
				pagination: { limit: 10 },
			});

		// 고저번대 통계 (최근 10회차)
		const recentHighLowStats = await client
			.records("lotto_draw_high_low_stats")
			.list({
				order: ["-round"],
				pagination: { limit: 10 },
			});

		// 번호 쌍 통계 (상위 10개)
		const topPairStats = await client.records("lotto_number_pair_stats").list({
			order: ["-pair_count"],
			pagination: { limit: 10 },
		});

		return {
			latestRound,
			latestDrawDate,
			totalRounds,
			topNumberStats: topNumberStats.records,
			bottomNumberStats: bottomNumberStats.records,
			recentOddEvenStats: recentOddEvenStats.records,
			recentColorStats: recentColorStats.records,
			recentSectionStats: recentSectionStats.records,
			recentHighLowStats: recentHighLowStats.records,
			topPairStats: topPairStats.records,
		};
	} catch (error) {
		console.error("통계 데이터 로드 실패:", error);
		return {
			latestRound: 0,
			latestDrawDate: "",
			totalRounds: 0,
			topNumberStats: [],
			bottomNumberStats: [],
			recentOddEvenStats: [],
			recentColorStats: [],
			recentSectionStats: [],
			recentHighLowStats: [],
			topPairStats: [],
		};
	}
};

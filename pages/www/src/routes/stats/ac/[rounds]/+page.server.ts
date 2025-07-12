import { env } from "$env/dynamic/private";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

export const load: PageServerLoad = async ({ params }) => {
	try {
		const roundsParam = params.rounds;
		const selectedRounds = Number(roundsParam);

		// 유효성 검사
		if (Number.isNaN(selectedRounds) || selectedRounds < 1) {
			throw new Error("잘못된 회차 파라미터입니다.");
		}

		// 전체 회차 수 조회
		const totalRoundsResponse = await client
			.records("lotto_draw_results")
			.list({
				order: ["-round"],
				pagination: { limit: 1 },
			});

		const totalRounds =
			totalRoundsResponse.records.length > 0
				? (totalRoundsResponse.records[0] as { round: number }).round
				: 0;

		// 최대 회차 검증
		if (selectedRounds > totalRounds) {
			throw new Error(`최대 ${totalRounds}회차까지만 조회 가능합니다.`);
		}

		// AC값 통계 데이터 조회
		const acStatsResponse = await client.records("lotto_draw_ac_stats").list({
			order: ["-round"],
			pagination: { limit: selectedRounds },
		});

		// 통계 요약 계산
		const records = acStatsResponse.records as Array<{
			round: number;
			ac_value: number;
		}>;

		const acValues = records.map((r) => r.ac_value);
		const acCounts = acValues.reduce(
			(acc, val) => {
				acc[val] = (acc[val] || 0) + 1;
				return acc;
			},
			{} as Record<number, number>,
		);

		const summary = {
			totalDraws: records.length,
			avgAC:
				acValues.length > 0
					? acValues.reduce((a, b) => a + b, 0) / acValues.length
					: 0,
			minAC: acValues.length > 0 ? Math.min(...acValues) : 0,
			maxAC: acValues.length > 0 ? Math.max(...acValues) : 0,
			distribution: acCounts,
		};

		return {
			acStats: {
				records,
				summary,
			},
			selectedRounds,
			totalRounds,
			pageTitle: `AC값 통계 (최근 ${selectedRounds}회차)`,
		};
	} catch (error) {
		console.error("AC 통계 데이터 로드 오류:", error);
		throw error;
	}
};

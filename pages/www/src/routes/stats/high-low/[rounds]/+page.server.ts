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

		// 고저 통계 데이터 조회 (최신 N회차)
		const highLowResponse = await client.records("lotto_draw_results").list({
			order: ["-round"],
			pagination: { limit: selectedRounds },
		});

		const records = highLowResponse.records as Array<{
			round: number;
			numbers: string;
		}>;

		// 고저 분포 계산
		let lowCount = 0;
		let highCount = 0;
		const highLowDistribution: Record<string, number> = {};

		for (const record of records) {
			// Skip records with invalid numbers data
			if (
				!record.numbers ||
				record.numbers === "undefined" ||
				record.numbers === "null"
			) {
				console.warn(
					`Skipping record ${record.round} due to invalid numbers data:`,
					record.numbers,
				);
				continue;
			}

			let numbers: number[];
			try {
				numbers = JSON.parse(record.numbers) as number[];
			} catch (error) {
				console.warn(
					`Failed to parse numbers for record ${record.round}:`,
					record.numbers,
					error,
				);
				continue;
			}

			let low = 0;
			let high = 0;

			for (const num of numbers) {
				if (num <= 22) {
					low++;
					lowCount++;
				} else {
					high++;
					highCount++;
				}
			}

			// 고저 분포 패턴 기록 (저:고)
			const pattern = `${low}:${high}`;
			highLowDistribution[pattern] = (highLowDistribution[pattern] || 0) + 1;
		}

		const summary = {
			totalDraws: records.length,
			lowCount,
			highCount,
			distribution: highLowDistribution,
		};

		return {
			highLowStats: {
				records,
				summary,
			},
			selectedRounds,
			totalRounds,
			pageTitle: `고저 통계 (최근 ${selectedRounds}회차)`,
		};
	} catch (error) {
		console.error("고저 통계 데이터 로드 오류:", error);
		throw error;
	}
};

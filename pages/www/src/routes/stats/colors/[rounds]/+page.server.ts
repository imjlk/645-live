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

		// 색상 통계 데이터 조회 (최신 N회차)
		const colorsResponse = await client.records("lotto_draw_results").list({
			order: ["-round"],
			pagination: { limit: selectedRounds },
		});

		const records = colorsResponse.records as Array<{
			round: number;
			numbers: string;
		}>;

		// 색상별 카운트 계산
		const colorCounts = {
			red: 0, // 1-10
			orange: 0, // 11-20
			yellow: 0, // 21-30
			blue: 0, // 31-40
			green: 0, // 41-45
		};

		const colorDistribution: Record<string, number> = {};

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

			const colorStats = {
				red: 0,
				orange: 0,
				yellow: 0,
				blue: 0,
				green: 0,
			};

			for (const num of numbers) {
				if (num >= 1 && num <= 10) {
					colorStats.red++;
					colorCounts.red++;
				} else if (num >= 11 && num <= 20) {
					colorStats.orange++;
					colorCounts.orange++;
				} else if (num >= 21 && num <= 30) {
					colorStats.yellow++;
					colorCounts.yellow++;
				} else if (num >= 31 && num <= 40) {
					colorStats.blue++;
					colorCounts.blue++;
				} else if (num >= 41 && num <= 45) {
					colorStats.green++;
					colorCounts.green++;
				}
			}

			// 색상 분포 패턴 기록
			const pattern = `${colorStats.red}-${colorStats.orange}-${colorStats.yellow}-${colorStats.blue}-${colorStats.green}`;
			colorDistribution[pattern] = (colorDistribution[pattern] || 0) + 1;
		}

		const summary = {
			totalDraws: records.length,
			colorCounts,
			distribution: colorDistribution,
		};

		return {
			colorStats: {
				records,
				summary,
			},
			selectedRounds,
			totalRounds,
			pageTitle: `색상 구간 통계 (최근 ${selectedRounds}회차)`,
		};
	} catch (error) {
		console.error("색상 통계 데이터 로드 오류:", error);
		throw error;
	}
};

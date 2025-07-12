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

		// 구간 통계 데이터 조회 (최신 N회차)
		const sectionsResponse = await client.records("lotto_draw_results").list({
			order: ["-round"],
			pagination: { limit: selectedRounds },
		});

		const records = sectionsResponse.records as Array<{
			round: number;
			numbers: string;
		}>;

		// 구간별 카운트 계산 (1-15, 16-30, 31-45)
		const sectionCounts = {
			section1: 0, // 1-15
			section2: 0, // 16-30
			section3: 0, // 31-45
		};

		const sectionDistribution: Record<string, number> = {};

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

			const sectionStats = {
				section1: 0,
				section2: 0,
				section3: 0,
			};

			for (const num of numbers) {
				if (num >= 1 && num <= 15) {
					sectionStats.section1++;
					sectionCounts.section1++;
				} else if (num >= 16 && num <= 30) {
					sectionStats.section2++;
					sectionCounts.section2++;
				} else if (num >= 31 && num <= 45) {
					sectionStats.section3++;
					sectionCounts.section3++;
				}
			}

			// 구간 분포 패턴 기록
			const pattern = `${sectionStats.section1}-${sectionStats.section2}-${sectionStats.section3}`;
			sectionDistribution[pattern] = (sectionDistribution[pattern] || 0) + 1;
		}

		const summary = {
			totalDraws: records.length,
			sectionCounts,
			distribution: sectionDistribution,
		};

		return {
			sectionStats: {
				records,
				summary,
			},
			selectedRounds,
			totalRounds,
			pageTitle: `구간 통계 (최근 ${selectedRounds}회차)`,
		};
	} catch (error) {
		console.error("구간 통계 데이터 로드 오류:", error);
		throw error;
	}
};

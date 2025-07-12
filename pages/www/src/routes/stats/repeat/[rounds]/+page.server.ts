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

		// 연속번호 통계 데이터 조회 (최신 N회차)
		const repeatResponse = await client.records("lotto_draw_results").list({
			order: ["-round"],
			pagination: { limit: selectedRounds },
		});

		const records = repeatResponse.records as Array<{
			round: number;
			numbers: string;
		}>;

		// 연속번호 패턴 분석
		let totalConsecutive = 0;
		const consecutivePatterns: Record<number, number> = {};
		const recordsWithConsecutive = [];

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

			const sortedNumbers = numbers.sort((a, b) => a - b);

			let consecutiveCount = 0;
			const consecutiveGroups = [];
			let currentGroup = [sortedNumbers[0]];

			for (let i = 1; i < sortedNumbers.length; i++) {
				if (sortedNumbers[i] === sortedNumbers[i - 1] + 1) {
					currentGroup.push(sortedNumbers[i]);
				} else {
					if (currentGroup.length >= 2) {
						consecutiveGroups.push(currentGroup);
						consecutiveCount += currentGroup.length;
					}
					currentGroup = [sortedNumbers[i]];
				}
			}

			// 마지막 그룹 처리
			if (currentGroup.length >= 2) {
				consecutiveGroups.push(currentGroup);
				consecutiveCount += currentGroup.length;
			}

			totalConsecutive += consecutiveCount;
			consecutivePatterns[consecutiveCount] =
				(consecutivePatterns[consecutiveCount] || 0) + 1;

			recordsWithConsecutive.push({
				...record,
				consecutiveCount,
				consecutiveGroups,
			});
		}

		const summary = {
			totalDraws: records.length,
			totalConsecutive,
			averageConsecutive:
				records.length > 0 ? totalConsecutive / records.length : 0,
			patterns: consecutivePatterns,
		};

		return {
			repeatStats: {
				records: recordsWithConsecutive,
				summary,
			},
			selectedRounds,
			totalRounds,
			pageTitle: `연속번호 통계 (최근 ${selectedRounds}회차)`,
		};
	} catch (error) {
		console.error("연속번호 통계 데이터 로드 오류:", error);
		throw error;
	}
};

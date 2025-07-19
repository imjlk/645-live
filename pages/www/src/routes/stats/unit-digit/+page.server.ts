import { env } from "$env/static/public";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.PUBLIC_TRAILBASE_URL || "http://localhost:4000");

// 정적 페이지이므로 prerender 사용
export const prerender = true;

export const load: PageServerLoad = async () => {
	try {
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

		// 끝수 통계 데이터 (배치 처리로 모든 데이터 가져오기)
		let allUnitDigitStats: Array<{
			round: number;
			digit_0_count: number;
			digit_1_count: number;
			digit_2_count: number;
			digit_3_count: number;
			digit_4_count: number;
			digit_5_count: number;
			digit_6_count: number;
			digit_7_count: number;
			digit_8_count: number;
			digit_9_count: number;
		}> = [];
		const batchSize = 1024;
		let batchOffset = 0;

		while (true) {
			const unitDigitStatsResponse = await client
				.records("lotto_draw_unit_digit_stats")
				.list({
					order: ["-round"],
					pagination: { limit: batchSize, offset: batchOffset },
				});

			const batchRecords = unitDigitStatsResponse.records as Array<{
				round: number;
				digit_0_count: number;
				digit_1_count: number;
				digit_2_count: number;
				digit_3_count: number;
				digit_4_count: number;
				digit_5_count: number;
				digit_6_count: number;
				digit_7_count: number;
				digit_8_count: number;
				digit_9_count: number;
			}>;

			if (batchRecords.length === 0) {
				break;
			}

			allUnitDigitStats = allUnitDigitStats.concat(batchRecords);
			batchOffset += batchSize;
		}

		// 통계 요약 계산
		const totalRecords = allUnitDigitStats.length;

		// 각 끝수별 총 출현 횟수 및 평균 계산
		const digitTotals = {
			"0": 0,
			"1": 0,
			"2": 0,
			"3": 0,
			"4": 0,
			"5": 0,
			"6": 0,
			"7": 0,
			"8": 0,
			"9": 0,
		};

		const digitAverages = {
			"0": "0.00",
			"1": "0.00",
			"2": "0.00",
			"3": "0.00",
			"4": "0.00",
			"5": "0.00",
			"6": "0.00",
			"7": "0.00",
			"8": "0.00",
			"9": "0.00",
		};

		for (const record of allUnitDigitStats) {
			digitTotals["0"] += record.digit_0_count;
			digitTotals["1"] += record.digit_1_count;
			digitTotals["2"] += record.digit_2_count;
			digitTotals["3"] += record.digit_3_count;
			digitTotals["4"] += record.digit_4_count;
			digitTotals["5"] += record.digit_5_count;
			digitTotals["6"] += record.digit_6_count;
			digitTotals["7"] += record.digit_7_count;
			digitTotals["8"] += record.digit_8_count;
			digitTotals["9"] += record.digit_9_count;
		}

		// 평균 계산
		for (let i = 0; i <= 9; i++) {
			const digit = String(i) as keyof typeof digitAverages;
			digitAverages[digit] =
				totalRecords > 0
					? (digitTotals[digit] / totalRecords).toFixed(2)
					: "0.00";
		}

		// 끝수별 개수 분포 분석 (0개, 1개, 2개 등)
		const digitCountDistribution = {
			"0": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			"1": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			"2": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			"3": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			"4": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			"5": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			"6": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			"7": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			"8": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			"9": { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
		};

		for (const record of allUnitDigitStats) {
			const counts = [
				record.digit_0_count,
				record.digit_1_count,
				record.digit_2_count,
				record.digit_3_count,
				record.digit_4_count,
				record.digit_5_count,
				record.digit_6_count,
				record.digit_7_count,
				record.digit_8_count,
				record.digit_9_count,
			];

			counts.forEach((count, index) => {
				const digit = String(index) as keyof typeof digitCountDistribution;
				const countKey = String(
					Math.min(count, 6),
				) as keyof (typeof digitCountDistribution)["0"];
				digitCountDistribution[digit][countKey]++;
			});
		}

		// 최근 10회차 통계
		const recentStats = allUnitDigitStats.slice(0, 10);

		// 가장 많이/적게 나온 끝수
		const sortedDigits = Object.entries(digitTotals).sort(
			(a, b) => b[1] - a[1],
		);
		const mostFrequentDigit = sortedDigits[0];
		const leastFrequentDigit = sortedDigits[sortedDigits.length - 1];

		return {
			unitDigitStats: allUnitDigitStats,
			totalRounds,
			totalRecords,
			digitTotals,
			digitAverages,
			digitCountDistribution,
			recentStats,
			mostFrequentDigit,
			leastFrequentDigit,
			selectedRounds: 0, // 기본값은 0 (전체 보기)
		};
	} catch (error) {
		console.error("끝수 통계 데이터 로드 실패:", error);
		return {
			unitDigitStats: [],
			totalRounds: 0,
			totalRecords: 0,
			digitTotals: {},
			digitAverages: {},
			digitCountDistribution: {},
			recentStats: [],
			mostFrequentDigit: ["0", 0],
			leastFrequentDigit: ["0", 0],
			selectedRounds: 0,
		};
	}
};

import { env } from "$env/dynamic/public";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.PUBLIC_TRAILBASE_URL || "http://localhost:4000");

// 동적 페이지이므로 SSR 사용
export const prerender = false;
export const ssr = true;

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

		// 끝자리수 통계 데이터 조회 (배치 처리로 모든 데이터 가져오기)
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
		let offset = 0;

		while (allUnitDigitStats.length < selectedRounds) {
			const remainingRecords = selectedRounds - allUnitDigitStats.length;
			const currentLimit = Math.min(batchSize, remainingRecords);

			const unitDigitStatsResponse = await client
				.records("lotto_draw_unit_digit_stats")
				.list({
					order: ["-round"],
					pagination: { limit: currentLimit, offset },
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
			offset += currentLimit;
		}

		// 통계 요약 계산 (요청한 회차 수만큼만 사용)
		const records = allUnitDigitStats.slice(0, selectedRounds);

		// 끝자리수별 카운트 계산
		const digitCounts = {
			digit0: 0,
			digit1: 0,
			digit2: 0,
			digit3: 0,
			digit4: 0,
			digit5: 0,
			digit6: 0,
			digit7: 0,
			digit8: 0,
			digit9: 0,
		};

		const digitDistribution: Record<string, number> = {};

		for (const record of records) {
			// 끝자리수별 총 개수 누적
			digitCounts.digit0 += record.digit_0_count;
			digitCounts.digit1 += record.digit_1_count;
			digitCounts.digit2 += record.digit_2_count;
			digitCounts.digit3 += record.digit_3_count;
			digitCounts.digit4 += record.digit_4_count;
			digitCounts.digit5 += record.digit_5_count;
			digitCounts.digit6 += record.digit_6_count;
			digitCounts.digit7 += record.digit_7_count;
			digitCounts.digit8 += record.digit_8_count;
			digitCounts.digit9 += record.digit_9_count;

			// 끝자리수 분포 패턴 기록
			const pattern = `${record.digit_0_count}-${record.digit_1_count}-${record.digit_2_count}-${record.digit_3_count}-${record.digit_4_count}-${record.digit_5_count}-${record.digit_6_count}-${record.digit_7_count}-${record.digit_8_count}-${record.digit_9_count}`;
			digitDistribution[pattern] = (digitDistribution[pattern] || 0) + 1;
		}

		// 끝자리수별 평균 계산
		const totalRecords = records.length;
		const digitAverages = {
			digit0:
				totalRecords > 0
					? (digitCounts.digit0 / totalRecords).toFixed(2)
					: "0.00",
			digit1:
				totalRecords > 0
					? (digitCounts.digit1 / totalRecords).toFixed(2)
					: "0.00",
			digit2:
				totalRecords > 0
					? (digitCounts.digit2 / totalRecords).toFixed(2)
					: "0.00",
			digit3:
				totalRecords > 0
					? (digitCounts.digit3 / totalRecords).toFixed(2)
					: "0.00",
			digit4:
				totalRecords > 0
					? (digitCounts.digit4 / totalRecords).toFixed(2)
					: "0.00",
			digit5:
				totalRecords > 0
					? (digitCounts.digit5 / totalRecords).toFixed(2)
					: "0.00",
			digit6:
				totalRecords > 0
					? (digitCounts.digit6 / totalRecords).toFixed(2)
					: "0.00",
			digit7:
				totalRecords > 0
					? (digitCounts.digit7 / totalRecords).toFixed(2)
					: "0.00",
			digit8:
				totalRecords > 0
					? (digitCounts.digit8 / totalRecords).toFixed(2)
					: "0.00",
			digit9:
				totalRecords > 0
					? (digitCounts.digit9 / totalRecords).toFixed(2)
					: "0.00",
		};

		// 최빈 끝자리수 찾기
		const mostFrequentDigit = Object.entries(digitAverages).reduce(
			(prev, curr) =>
				Number.parseFloat(curr[1]) > Number.parseFloat(prev[1]) ? curr : prev,
		);

		const summary = {
			totalDraws: records.length,
			digitCounts,
			digitAverages,
			mostFrequentDigit,
			distribution: digitDistribution,
		};

		return {
			unitDigitStats: {
				records,
				summary,
			},
			selectedRounds,
			totalRounds,
			pageTitle: `끝자리수 통계 (최근 ${selectedRounds}회차)`,
		};
	} catch (error) {
		console.error("끝수 통계 데이터 로드 오류:", error);
		throw error;
	}
};

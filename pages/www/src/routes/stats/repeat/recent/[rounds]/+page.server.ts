import { PUBLIC_TRAILBASE_URL } from "$env/static/public";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(PUBLIC_TRAILBASE_URL || "http://localhost:4000");

// 페이지 옵션 설정 - 동적 페이지이므로 SSR 사용
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

		// 연속 회차 중복 번호 통계 데이터 조회 (배치 처리로 모든 데이터 가져오기)
		let allRepeatStats: Array<{
			round: number;
			repeat_count: number;
		}> = [];
		const batchSize = 1024;
		let offset = 0;

		while (allRepeatStats.length < selectedRounds) {
			const remainingRecords = selectedRounds - allRepeatStats.length;
			const currentLimit = Math.min(batchSize, remainingRecords);

			const repeatStatsResponse = await client
				.records("lotto_draw_repeat_stats")
				.list({
					order: ["-round"],
					pagination: { limit: currentLimit, offset },
				});

			const batchRecords = repeatStatsResponse.records as Array<{
				round: number;
				repeat_count: number;
			}>;

			if (batchRecords.length === 0) {
				break;
			}

			allRepeatStats = allRepeatStats.concat(batchRecords);
			offset += currentLimit;
		}

		// 통계 요약 계산 (요청한 회차 수만큼만 사용)
		const records = allRepeatStats.slice(0, selectedRounds);

		// 중복 개수별 카운트 계산
		const repeatCounts = {
			"0": 0,
			"1": 0,
			"2": 0,
			"3": 0,
			"4": 0,
			"5": 0,
			"6": 0,
		};

		const repeatDistribution: Record<string, number> = {};
		let totalRepeatCount = 0;

		for (const record of records) {
			// 중복 개수별 총 개수 누적
			totalRepeatCount += record.repeat_count;

			// 중복 개수 분포 기록
			const repeatKey = String(
				Math.min(record.repeat_count, 6),
			) as keyof typeof repeatCounts;
			repeatCounts[repeatKey]++;

			// 중복 패턴 기록
			const pattern = `${record.repeat_count}개`;
			repeatDistribution[pattern] = (repeatDistribution[pattern] || 0) + 1;
		}

		// 중복 개수별 평균 계산
		const totalRecords = records.length;
		const averageRepeatCount =
			totalRecords > 0 ? (totalRepeatCount / totalRecords).toFixed(2) : "0.00";

		// 통계 지표 계산
		const maxRepeatCount =
			records.length > 0 ? Math.max(...records.map((r) => r.repeat_count)) : 0;
		const zeroRepeatCount = repeatCounts["0"];
		const zeroRepeatRate =
			totalRecords > 0
				? ((zeroRepeatCount / totalRecords) * 100).toFixed(1)
				: "0.0";
		const highRepeatCount =
			repeatCounts["3"] +
			repeatCounts["4"] +
			repeatCounts["5"] +
			repeatCounts["6"];
		const highRepeatRate =
			totalRecords > 0
				? ((highRepeatCount / totalRecords) * 100).toFixed(1)
				: "0.0";

		const summary = {
			totalDraws: records.length,
			repeatCounts,
			averageRepeatCount,
			maxRepeatCount,
			zeroRepeatCount,
			zeroRepeatRate,
			highRepeatCount,
			highRepeatRate,
			distribution: repeatDistribution,
		};

		return {
			repeatStats: {
				records,
				summary,
			},
			selectedRounds,
			totalRounds,
			pageTitle: `연속번호 중복 통계 (최근 ${selectedRounds}회차)`,
		};
	} catch (error) {
		console.error("연속번호 통계 데이터 로드 오류:", error);
		throw error;
	}
};

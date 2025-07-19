import { env } from "$env/dynamic/private";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

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

		// 연속 회차 중복 번호 통계 데이터 (배치 처리로 모든 데이터 가져오기)
		let allRepeatStats: Array<{
			round: number;
			repeat_count: number;
		}> = [];
		const batchSize = 1024;
		let batchOffset = 0;

		while (true) {
			const repeatStatsResponse = await client
				.records("lotto_draw_repeat_stats")
				.list({
					order: ["-round"],
					pagination: { limit: batchSize, offset: batchOffset },
				});

			const batchRecords = repeatStatsResponse.records as Array<{
				round: number;
				repeat_count: number;
			}>;

			if (batchRecords.length === 0) {
				break;
			}

			allRepeatStats = allRepeatStats.concat(batchRecords);
			batchOffset += batchSize;
		}

		// 통계 요약 계산
		const records = allRepeatStats;
		const analyzedRounds = records.length;
		const averageRepeatCount =
			analyzedRounds > 0
				? (
						records.reduce((sum, record) => sum + record.repeat_count, 0) /
						analyzedRounds
					).toFixed(2)
				: "0.00";

		const repeatCountDistribution = {
			"0": 0,
			"1": 0,
			"2": 0,
			"3": 0,
			"4": 0,
			"5": 0,
			"6": 0,
		};

		for (const record of records) {
			const repeatKey = String(
				record.repeat_count,
			) as keyof typeof repeatCountDistribution;
			if (repeatKey in repeatCountDistribution) {
				repeatCountDistribution[repeatKey]++;
			}
		}

		const repeatCounts = records.map((r) => r.repeat_count);
		const maxRepeatCount =
			repeatCounts.length > 0 ? Math.max(...repeatCounts) : 0;
		const recentStats = records.slice(0, 10);
		const zeroRepeatCount = repeatCountDistribution["0"];
		const zeroRepeatRate =
			analyzedRounds > 0
				? ((zeroRepeatCount / analyzedRounds) * 100).toFixed(1)
				: "0.0";
		const highRepeatCount =
			repeatCountDistribution["3"] +
			repeatCountDistribution["4"] +
			repeatCountDistribution["5"] +
			repeatCountDistribution["6"];
		const highRepeatRate =
			analyzedRounds > 0
				? ((highRepeatCount / analyzedRounds) * 100).toFixed(1)
				: "0.0";

		return {
			repeatStats: allRepeatStats,
			totalRounds,
			totalRecords: analyzedRounds,
			averageRepeatCount,
			maxRepeatCount,
			repeatCountDistribution,
			recentStats,
			zeroRepeatCount,
			zeroRepeatRate,
			highRepeatCount,
			highRepeatRate,
			selectedRounds: 0, // 기본값은 0 (전체 보기)
		};
	} catch (error) {
		console.error("연속 번호 통계 데이터 로드 실패:", error);
		return {
			repeatStats: [],
			totalRounds: 0,
			totalRecords: 0,
			averageRepeatCount: "0.00",
			maxRepeatCount: 0,
			repeatCountDistribution: {},
			recentStats: [],
			zeroRepeatCount: 0,
			zeroRepeatRate: "0.0",
			highRepeatCount: 0,
			highRepeatRate: "0.0",
			selectedRounds: 0,
		};
	}
};

import { PUBLIC_TRAILBASE_URL } from "$env/static/public";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(PUBLIC_TRAILBASE_URL || "http://localhost:4000");

// 정적 페이지이므로 prerender 사용
export const prerender = true;

export const load: PageServerLoad = async () => {
	try {
		// 번호 쌍 통계 데이터 (배치 처리로 모든 데이터 가져오기)
		let allPairStats: Array<{
			id: number;
			number_a: number;
			number_b: number;
			pair_count: number;
		}> = [];
		const batchSize = 1024;
		let batchOffset = 0;

		while (true) {
			const pairStatsResponse = await client
				.records("lotto_number_pair_stats")
				.list({
					order: ["-pair_count", "number_a", "number_b"],
					pagination: { limit: batchSize, offset: batchOffset },
				});

			const batchRecords = pairStatsResponse.records as Array<{
				id: number;
				number_a: number;
				number_b: number;
				pair_count: number;
			}>;

			if (batchRecords.length === 0) {
				break;
			}

			allPairStats = allPairStats.concat(batchRecords);
			batchOffset += batchSize;
		}

		// 통계 요약 계산
		const pairCounts = allPairStats.map((record) => record.pair_count);

		const totalPairs = allPairStats.length;
		const maxPairCount = pairCounts.length > 0 ? Math.max(...pairCounts) : 0;
		const minPairCount = pairCounts.length > 0 ? Math.min(...pairCounts) : 0;
		const averagePairCount =
			totalPairs > 0
				? pairCounts.reduce((sum, count) => sum + count, 0) / totalPairs
				: 0;

		// 번호별 총 동반 출현 횟수 계산 (다른 모든 번호와의 총 동반 출현 횟수)
		const numberTotalPairCounts = new Map<number, number>();
		for (const record of allPairStats) {
			const currentA = numberTotalPairCounts.get(record.number_a) || 0;
			const currentB = numberTotalPairCounts.get(record.number_b) || 0;
			numberTotalPairCounts.set(record.number_a, currentA + record.pair_count);
			numberTotalPairCounts.set(record.number_b, currentB + record.pair_count);
		}

		// 디버깅: 상위 3개 번호의 데이터 확인
		const sortedNumbers = Array.from(numberTotalPairCounts.entries()).sort((a, b) => b[1] - a[1]);

		// 가장 높은 총 동반 출현 횟수를 가진 번호들 (상위 10개)
		const topNumbersByPairCount = sortedNumbers.slice(0, 10);

		// 분포 분석
		const pairCountDistribution = {
			"0-5": 0,
			"6-10": 0,
			"11-15": 0,
			"16-20": 0,
			"21-25": 0,
			"26-30": 0,
			"31+": 0,
		};

		for (const count of pairCounts) {
			if (count <= 5) pairCountDistribution["0-5"]++;
			else if (count <= 10) pairCountDistribution["6-10"]++;
			else if (count <= 15) pairCountDistribution["11-15"]++;
			else if (count <= 20) pairCountDistribution["16-20"]++;
			else if (count <= 25) pairCountDistribution["21-25"]++;
			else if (count <= 30) pairCountDistribution["26-30"]++;
			else pairCountDistribution["31+"]++;
		}

		return {
			pairStats: allPairStats,
			totalPairs,
			maxPairCount,
			minPairCount,
			averagePairCount: averagePairCount.toFixed(2),
			topNumbersByPairCount,
			pairCountDistribution,
		};
	} catch (error) {
		console.error("번호 쌍 통계 데이터 로드 실패:", error);
		return {
			pairStats: [],
			totalPairs: 0,
			maxPairCount: 0,
			minPairCount: 0,
			averagePairCount: "0.00",
			topNumbersByPairCount: [],
			pairCountDistribution: {},
		};
	}
};

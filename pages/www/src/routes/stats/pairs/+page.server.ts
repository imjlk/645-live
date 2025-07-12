import { env } from "$env/dynamic/private";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get("page") || "1");
	const limit = 50;
	const offset = (page - 1) * limit;

	try {
		// 번호 쌍 통계 데이터 (상위 50개)
		const pairStatsResponse = await client
			.records("lotto_number_pair_stats")
			.list({
				order: ["-pair_count", "number_a", "number_b"],
				pagination: { limit, offset },
			});

		// 전체 번호 쌍 통계 요약 (모든 데이터)
		const allPairsResponse = await client
			.records("lotto_number_pair_stats")
			.list({
				order: ["-pair_count"],
			});

		// 통계 요약 계산
		const pairCounts = allPairsResponse.records.map(
			(record) => (record as { pair_count: number }).pair_count,
		);

		const totalPairs = allPairsResponse.records.length;
		const maxPairCount = Math.max(...pairCounts);
		const minPairCount = Math.min(...pairCounts);
		const averagePairCount =
			pairCounts.reduce((sum, count) => sum + count, 0) / totalPairs;

		// 번호별 동반 출현 횟수 계산
		const numberPairCounts = new Map<number, number>();
		for (const record of allPairsResponse.records) {
			const pairRecord = record as {
				number_a: number;
				number_b: number;
				pair_count: number;
			};
			const currentA = numberPairCounts.get(pairRecord.number_a) || 0;
			const currentB = numberPairCounts.get(pairRecord.number_b) || 0;
			numberPairCounts.set(
				pairRecord.number_a,
				currentA + pairRecord.pair_count,
			);
			numberPairCounts.set(
				pairRecord.number_b,
				currentB + pairRecord.pair_count,
			);
		}

		// 가장 많이 동반 출현한 번호들 (상위 10개)
		const topNumbersByPairCount = Array.from(numberPairCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10);

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
			pairStats: pairStatsResponse.records,
			totalPairs,
			maxPairCount,
			minPairCount,
			averagePairCount: averagePairCount.toFixed(2),
			topNumbersByPairCount,
			pairCountDistribution,
			currentPage: page,
			totalPages: Math.ceil((pairStatsResponse.total_count || 0) / limit),
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
			currentPage: 1,
			totalPages: 1,
		};
	}
};

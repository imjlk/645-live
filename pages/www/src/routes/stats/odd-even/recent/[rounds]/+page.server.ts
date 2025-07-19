import { PUBLIC_TRAILBASE_URL } from "$env/static/public";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(PUBLIC_TRAILBASE_URL || "http://localhost:4000");

// 동적 페이지이므로 SSR 사용
export const prerender = false;
export const ssr = true;

export const load: PageServerLoad = async ({ params }) => {
	const rounds = Number(params.rounds || "100");

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

		// 홀짝 통계 데이터 조회 (배치 처리로 지정된 회차 수만큼 가져오기)
		let allOddEvenStats: Array<{
			round: number;
			odd_count: number;
			even_count: number;
			numbers_sum: number;
		}> = [];
		const batchSize = 1024;
		let batchOffset = 0;
		let totalFetched = 0;

		while (totalFetched < rounds) {
			const currentBatchSize = Math.min(batchSize, rounds - totalFetched);
			const oddEvenStatsResponse = await client
				.records("lotto_draw_odd_even_stats")
				.list({
					order: ["-round"],
					pagination: { limit: currentBatchSize, offset: batchOffset },
				});

			const batchRecords = oddEvenStatsResponse.records as Array<{
				round: number;
				odd_count: number;
				even_count: number;
				numbers_sum: number;
			}>;

			if (batchRecords.length === 0) {
				break;
			}

			allOddEvenStats = allOddEvenStats.concat(batchRecords);
			batchOffset += currentBatchSize;
			totalFetched += batchRecords.length;
		}

		// 홀짝 분포 집계
		const oddEvenDistribution = {
			"0": 0,
			"1": 0,
			"2": 0,
			"3": 0,
			"4": 0,
			"5": 0,
			"6": 0,
		};

		// 숫자 합계 분포 (구간별)
		const sumDistribution = {
			"60-80": 0,
			"81-100": 0,
			"101-120": 0,
			"121-140": 0,
			"141-160": 0,
			"161-180": 0,
			"181-200": 0,
			"201-220": 0,
			"221-240": 0,
		};

		// 선택한 회차 데이터에서 분포 계산
		for (const stat of allOddEvenStats) {
			// 홀수 개수 분포
			if (stat.odd_count >= 0 && stat.odd_count <= 6) {
				oddEvenDistribution[
					stat.odd_count.toString() as keyof typeof oddEvenDistribution
				]++;
			}

			// 합계 분포
			const sum = stat.numbers_sum;
			if (sum >= 60 && sum <= 80) sumDistribution["60-80"]++;
			else if (sum >= 81 && sum <= 100) sumDistribution["81-100"]++;
			else if (sum >= 101 && sum <= 120) sumDistribution["101-120"]++;
			else if (sum >= 121 && sum <= 140) sumDistribution["121-140"]++;
			else if (sum >= 141 && sum <= 160) sumDistribution["141-160"]++;
			else if (sum >= 161 && sum <= 180) sumDistribution["161-180"]++;
			else if (sum >= 181 && sum <= 200) sumDistribution["181-200"]++;
			else if (sum >= 201 && sum <= 220) sumDistribution["201-220"]++;
			else if (sum >= 221 && sum <= 240) sumDistribution["221-240"]++;
		}

		// 통계 요약 계산
		const records = allOddEvenStats;
		const analyzedRounds = records.length;
		const oddCounts = records.map((r) => r.odd_count);
		const evenCounts = records.map((r) => r.even_count);

		// 기본 통계
		const averageOddCount =
			analyzedRounds > 0
				? (
						oddCounts.reduce((sum, val) => sum + val, 0) / analyzedRounds
					).toFixed(2)
				: "0.00";
		const averageEvenCount =
			analyzedRounds > 0
				? (
						evenCounts.reduce((sum, val) => sum + val, 0) / analyzedRounds
					).toFixed(2)
				: "0.00";

		// 가장 빈번한 홀짝 패턴 찾기
		const mostFrequentPattern = Object.entries(oddEvenDistribution)
			.filter(([_, count]) => count > 0)
			.sort((a, b) => b[1] - a[1])[0] || ["3", 0];

		// 최근 10회차 데이터
		const recentStats = allOddEvenStats.slice(0, 10);

		// 복잡도 범위별 분포 계산
		const balancedCount = oddEvenDistribution["3"] || 0; // 3:3 균형
		const extremeCount =
			(oddEvenDistribution["0"] || 0) + (oddEvenDistribution["6"] || 0); // 0:6 또는 6:0

		const balancedRate =
			analyzedRounds > 0
				? ((balancedCount / analyzedRounds) * 100).toFixed(1)
				: "0.0";
		const extremeRate =
			analyzedRounds > 0
				? ((extremeCount / analyzedRounds) * 100).toFixed(1)
				: "0.0";

		return {
			oddEvenStats: allOddEvenStats,
			totalRounds,
			totalRecords: analyzedRounds,
			oddEvenDistribution,
			sumDistribution,
			averageOddCount,
			averageEvenCount,
			mostFrequentPattern,
			recentStats,
			balancedRate,
			extremeRate,
			selectedRounds: rounds,
		};
	} catch (error) {
		console.error("홀짝 통계 데이터 로드 실패:", error);
		return {
			oddEvenStats: [],
			totalRounds: 0,
			totalRecords: 0,
			oddEvenDistribution: {},
			sumDistribution: {},
			averageOddCount: "0.00",
			averageEvenCount: "0.00",
			mostFrequentPattern: ["3", 0],
			recentStats: [],
			balancedRate: "0.0",
			extremeRate: "0.0",
			selectedRounds: rounds,
		};
	}
};

import { env } from "$env/dynamic/private";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

export const load: PageServerLoad = async ({ url, params }) => {
	const page = Number(url.searchParams.get("page") || "1");
	const rounds = Number(params.rounds || "100");
	const limit = 20;
	const offset = (page - 1) * limit;

	try {
		// 홀짝 통계 데이터
		const oddEvenStatsResponse = await client
			.records("lotto_draw_odd_even_stats")
			.list({
				order: ["-round"],
				pagination: { limit, offset },
			});

		// 전체 회차 수
		const totalRoundsResponse = await client
			.records("lotto_draw_results")
			.list({
				pagination: { limit: 1 },
			});
		const totalRounds = totalRoundsResponse.total_count || 0;

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

		// 전체 데이터에서 분포 계산 (선택한 회차 수만큼)
		const allStatsResponse = await client
			.records("lotto_draw_odd_even_stats")
			.list({
				order: ["-round"],
				pagination: { limit: rounds },
			});

		for (const stat of allStatsResponse.records) {
			const statRecord = stat as { odd_count: number; numbers_sum: number };

			// 홀수 개수 분포
			if (statRecord.odd_count >= 0 && statRecord.odd_count <= 6) {
				oddEvenDistribution[
					statRecord.odd_count.toString() as keyof typeof oddEvenDistribution
				]++;
			}

			// 합계 분포
			const sum = statRecord.numbers_sum;
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

		return {
			oddEvenStats: oddEvenStatsResponse.records,
			totalRounds,
			oddEvenDistribution,
			sumDistribution,
			currentPage: page,
			totalPages: Math.ceil((oddEvenStatsResponse.total_count || 0) / limit),
			selectedRounds: rounds,
		};
	} catch (error) {
		console.error("홀짝 통계 데이터 로드 실패:", error);
		return {
			oddEvenStats: [],
			totalRounds: 0,
			oddEvenDistribution: {},
			sumDistribution: {},
			currentPage: 1,
			totalPages: 1,
			selectedRounds: rounds,
		};
	}
};

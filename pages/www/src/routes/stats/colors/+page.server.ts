import { env } from "$env/dynamic/private";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

// 페이지 옵션 설정 - 정적 페이지이므로 prerender 사용
export const prerender = true;

export const load: PageServerLoad = async ({ url }) => {

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

		// 색깔별 통계 데이터 조회 (배치 처리로 모든 데이터 가져오기)
		let allColorStats: Array<{
			round: number;
			yellow_count: number;
			blue_count: number;
			red_count: number;
			grey_count: number;
			green_count: number;
		}> = [];
		const batchSize = 1024;
		let batchOffset = 0;

		while (true) {
			const colorStatsResponse = await client
				.records("lotto_draw_color_stats")
				.list({
					order: ["-round"],
					pagination: { limit: batchSize, offset: batchOffset },
				});

			const batchRecords = colorStatsResponse.records as Array<{
				round: number;
				yellow_count: number;
				blue_count: number;
				red_count: number;
				grey_count: number;
				green_count: number;
			}>;

			if (batchRecords.length === 0) {
				break;
			}

			allColorStats = allColorStats.concat(batchRecords);
			batchOffset += batchSize;
		}

		// 색깔별 분포 집계
		const colorDistribution = {
			yellow: { total: 0, rounds: [] as number[] },
			blue: { total: 0, rounds: [] as number[] },
			red: { total: 0, rounds: [] as number[] },
			grey: { total: 0, rounds: [] as number[] },
			green: { total: 0, rounds: [] as number[] },
		};

		// 색깔별 개수 분포 (0-6개)
		const colorCountDistribution = {
			yellow: { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			blue: { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			red: { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			grey: { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			green: { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
		};

		// 전체 데이터에서 분포 계산
		for (const stat of allColorStats) {
			// 색깔별 총 개수 및 회차 기록
			colorDistribution.yellow.total += stat.yellow_count;
			colorDistribution.blue.total += stat.blue_count;
			colorDistribution.red.total += stat.red_count;
			colorDistribution.grey.total += stat.grey_count;
			colorDistribution.green.total += stat.green_count;

			// 색깔별 개수 분포
			colorCountDistribution.yellow[
				stat.yellow_count.toString() as keyof typeof colorCountDistribution.yellow
			]++;
			colorCountDistribution.blue[
				stat.blue_count.toString() as keyof typeof colorCountDistribution.blue
			]++;
			colorCountDistribution.red[
				stat.red_count.toString() as keyof typeof colorCountDistribution.red
			]++;
			colorCountDistribution.grey[
				stat.grey_count.toString() as keyof typeof colorCountDistribution.grey
			]++;
			colorCountDistribution.green[
				stat.green_count.toString() as keyof typeof colorCountDistribution.green
			]++;
		}

		// 색깔별 평균 계산
		const totalRecords = allColorStats.length;
		const colorAverages = {
			yellow: totalRecords > 0 ? (colorDistribution.yellow.total / totalRecords).toFixed(2) : "0.00",
			blue: totalRecords > 0 ? (colorDistribution.blue.total / totalRecords).toFixed(2) : "0.00",
			red: totalRecords > 0 ? (colorDistribution.red.total / totalRecords).toFixed(2) : "0.00",
			grey: totalRecords > 0 ? (colorDistribution.grey.total / totalRecords).toFixed(2) : "0.00",
			green: totalRecords > 0 ? (colorDistribution.green.total / totalRecords).toFixed(2) : "0.00",
		};

		// 최빈 색상 찾기
		const mostFrequentColor = Object.entries(colorAverages).reduce((prev, curr) => 
			Number.parseFloat(curr[1]) > Number.parseFloat(prev[1]) ? curr : prev
		);

		// 복잡도 범위별 분포 계산
		const lowComplexityCount = Object.values(colorCountDistribution)
			.reduce((sum, colorCounts) => sum + colorCounts["0"] + colorCounts["1"], 0);
		const highComplexityCount = Object.values(colorCountDistribution)
			.reduce((sum, colorCounts) => sum + colorCounts["4"] + colorCounts["5"] + colorCounts["6"], 0);

		const lowComplexityRate = totalRecords > 0 ? ((lowComplexityCount / (totalRecords * 5)) * 100).toFixed(1) : "0.0";
		const highComplexityRate = totalRecords > 0 ? ((highComplexityCount / (totalRecords * 5)) * 100).toFixed(1) : "0.0";

		// 최근 10회차 데이터
		const recentStats = allColorStats.slice(0, 10);

		return {
			colorStats: allColorStats, // 전체 데이터 표시
			colorDistribution,
			colorCountDistribution,
			colorAverages,
			mostFrequentColor,
			totalRecords,
			totalRounds,
			recentStats,
			lowComplexityRate,
			highComplexityRate,
		};
	} catch (error) {
		console.error("색깔별 통계 데이터 로드 실패:", error);
		return {
			colorStats: [],
			colorDistribution: {},
			colorCountDistribution: {},
			colorAverages: {},
			mostFrequentColor: ["yellow", "0.00"],
			totalRecords: 0,
			totalRounds: 0,
			recentStats: [],
			lowComplexityRate: "0.0",
			highComplexityRate: "0.0",
			currentPage: 1,
			totalPages: 1,
		};
	}
};

import { env } from "$env/dynamic/private";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get("page") || "1");
	const selectedRounds = Number(url.searchParams.get("rounds") || "500");
	const limit = 20;
	const offset = (page - 1) * limit;

	try {
		// 색깔별 통계 데이터
		const colorStatsResponse = await client
			.records("lotto_draw_color_stats")
			.list({
				order: ["-round"],
				pagination: { limit, offset },
			});

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

		// 전체 데이터에서 분포 계산 (선택된 회차 수만큼)
		const allStatsResponse = await client
			.records("lotto_draw_color_stats")
			.list({
				order: ["-round"],
				pagination: { limit: selectedRounds },
			});

		for (const stat of allStatsResponse.records) {
			const statRecord = stat as {
				round: number;
				yellow_count: number;
				blue_count: number;
				red_count: number;
				grey_count: number;
				green_count: number;
			};

			// 색깔별 총 개수 및 회차 기록
			colorDistribution.yellow.total += statRecord.yellow_count;
			colorDistribution.blue.total += statRecord.blue_count;
			colorDistribution.red.total += statRecord.red_count;
			colorDistribution.grey.total += statRecord.grey_count;
			colorDistribution.green.total += statRecord.green_count;

			// 색깔별 개수 분포
			colorCountDistribution.yellow[
				statRecord.yellow_count.toString() as keyof typeof colorCountDistribution.yellow
			]++;
			colorCountDistribution.blue[
				statRecord.blue_count.toString() as keyof typeof colorCountDistribution.blue
			]++;
			colorCountDistribution.red[
				statRecord.red_count.toString() as keyof typeof colorCountDistribution.red
			]++;
			colorCountDistribution.grey[
				statRecord.grey_count.toString() as keyof typeof colorCountDistribution.grey
			]++;
			colorCountDistribution.green[
				statRecord.green_count.toString() as keyof typeof colorCountDistribution.green
			]++;
		}

		// 색깔별 평균 계산
		const totalRecords = allStatsResponse.records.length;
		const colorAverages = {
			yellow: (colorDistribution.yellow.total / totalRecords).toFixed(2),
			blue: (colorDistribution.blue.total / totalRecords).toFixed(2),
			red: (colorDistribution.red.total / totalRecords).toFixed(2),
			grey: (colorDistribution.grey.total / totalRecords).toFixed(2),
			green: (colorDistribution.green.total / totalRecords).toFixed(2),
		};

		return {
			colorStats: colorStatsResponse.records,
			colorDistribution,
			colorCountDistribution,
			colorAverages,
			totalRecords,
			currentPage: page,
			totalPages: Math.ceil((colorStatsResponse.total_count || 0) / limit),
			selectedRounds,
		};
	} catch (error) {
		console.error("색깔별 통계 데이터 로드 실패:", error);
		return {
			colorStats: [],
			colorDistribution: {},
			colorCountDistribution: {},
			colorAverages: {},
			totalRecords: 0,
			currentPage: 1,
			totalPages: 1,
			selectedRounds: selectedRounds,
		};
	}
};

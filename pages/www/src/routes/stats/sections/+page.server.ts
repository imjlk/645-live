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
		// 구간별 통계 데이터
		const sectionStatsResponse = await client
			.records("lotto_draw_section_stats")
			.list({
				order: ["-round"],
				pagination: { limit, offset },
			});

		// 구간별 분포 집계
		const sectionDistribution = {
			section_1_10: { total: 0, average: 0 },
			section_11_20: { total: 0, average: 0 },
			section_21_30: { total: 0, average: 0 },
			section_31_40: { total: 0, average: 0 },
			section_41_45: { total: 0, average: 0 },
		};

		// 구간별 개수 분포
		const sectionCountDistribution = {
			section_1_10: { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			section_11_20: { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			section_21_30: { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			section_31_40: { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
			section_41_45: { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 },
		};

		// 전체 데이터에서 분포 계산 (선택된 회차 수만큼)
		const allStatsResponse = await client
			.records("lotto_draw_section_stats")
			.list({
				order: ["-round"],
				pagination: { limit: selectedRounds },
			});

		for (const stat of allStatsResponse.records) {
			const statRecord = stat as {
				round: number;
				section_1_10: number;
				section_11_20: number;
				section_21_30: number;
				section_31_40: number;
				section_41_45: number;
			};

			// 구간별 총 개수 누적
			sectionDistribution.section_1_10.total += statRecord.section_1_10;
			sectionDistribution.section_11_20.total += statRecord.section_11_20;
			sectionDistribution.section_21_30.total += statRecord.section_21_30;
			sectionDistribution.section_31_40.total += statRecord.section_31_40;
			sectionDistribution.section_41_45.total += statRecord.section_41_45;

			// 구간별 개수 분포
			sectionCountDistribution.section_1_10[
				statRecord.section_1_10.toString() as keyof typeof sectionCountDistribution.section_1_10
			]++;
			sectionCountDistribution.section_11_20[
				statRecord.section_11_20.toString() as keyof typeof sectionCountDistribution.section_11_20
			]++;
			sectionCountDistribution.section_21_30[
				statRecord.section_21_30.toString() as keyof typeof sectionCountDistribution.section_21_30
			]++;
			sectionCountDistribution.section_31_40[
				statRecord.section_31_40.toString() as keyof typeof sectionCountDistribution.section_31_40
			]++;
			sectionCountDistribution.section_41_45[
				statRecord.section_41_45.toString() as keyof typeof sectionCountDistribution.section_41_45
			]++;
		}

		// 구간별 평균 계산
		const totalRecords = allStatsResponse.records.length;
		if (totalRecords > 0) {
			sectionDistribution.section_1_10.average =
				sectionDistribution.section_1_10.total / totalRecords;
			sectionDistribution.section_11_20.average =
				sectionDistribution.section_11_20.total / totalRecords;
			sectionDistribution.section_21_30.average =
				sectionDistribution.section_21_30.total / totalRecords;
			sectionDistribution.section_31_40.average =
				sectionDistribution.section_31_40.total / totalRecords;
			sectionDistribution.section_41_45.average =
				sectionDistribution.section_41_45.total / totalRecords;
		}

		return {
			sectionStats: sectionStatsResponse.records,
			sectionDistribution,
			sectionCountDistribution,
			totalRecords,
			currentPage: page,
			totalPages: Math.ceil((sectionStatsResponse.total_count || 0) / limit),
			selectedRounds,
		};
	} catch (error) {
		console.error("구간별 통계 데이터 로드 실패:", error);
		return {
			sectionStats: [],
			sectionDistribution: {},
			sectionCountDistribution: {},
			totalRecords: 0,
			currentPage: 1,
			totalPages: 1,
			selectedRounds,
		};
	}
};

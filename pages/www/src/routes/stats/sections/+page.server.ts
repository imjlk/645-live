import { env } from "$env/static/public";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.PUBLIC_TRAILBASE_URL || "http://localhost:4000");

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

		// 구간별 통계 데이터 (배치 처리로 모든 데이터 가져오기)
		let allSectionStats: Array<{
			round: number;
			section_1_10: number;
			section_11_20: number;
			section_21_30: number;
			section_31_40: number;
			section_41_45: number;
		}> = [];
		const batchSize = 1024;
		let batchOffset = 0;

		while (true) {
			const sectionStatsResponse = await client
				.records("lotto_draw_section_stats")
				.list({
					order: ["-round"],
					pagination: { limit: batchSize, offset: batchOffset },
				});

			const batchRecords = sectionStatsResponse.records as Array<{
				round: number;
				section_1_10: number;
				section_11_20: number;
				section_21_30: number;
				section_31_40: number;
				section_41_45: number;
			}>;

			if (batchRecords.length === 0) {
				break;
			}

			allSectionStats = allSectionStats.concat(batchRecords);
			batchOffset += batchSize;
		}

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

		// 전체 데이터에서 분포 계산
		for (const statRecord of allSectionStats) {
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
		const totalRecords = allSectionStats.length;
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
			sectionStats: allSectionStats,
			sectionDistribution,
			sectionCountDistribution,
			totalRounds,
			totalRecords,
			selectedRounds: 0, // 기본값은 0 (전체 보기)
		};
	} catch (error) {
		console.error("구간별 통계 데이터 로드 실패:", error);
		return {
			sectionStats: [],
			sectionDistribution: {},
			sectionCountDistribution: {},
			totalRounds: 0,
			totalRecords: 0,
			selectedRounds: 0,
		};
	}
};

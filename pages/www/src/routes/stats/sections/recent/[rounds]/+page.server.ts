import { env } from "$env/dynamic/public";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.PUBLIC_TRAILBASE_URL || "http://localhost:4000");

// 동적 페이지이므로 SSR 사용
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

		// 구간 통계 데이터 조회 (최신 N회차)
		const sectionStatsResponse = await client
			.records("lotto_draw_section_stats")
			.list({
				order: ["-round"],
				pagination: { limit: selectedRounds },
			});

		const rawRecords = sectionStatsResponse.records as Array<{
			round: number;
			section_1_10: number;
			section_11_20: number;
			section_21_30: number;
			section_31_40: number;
			section_41_45: number;
		}>;

		// Transform records to match template expectations
		const records = rawRecords.map((record) => ({
			round: record.round,
			section1_count: record.section_1_10,
			section2_count: record.section_11_20,
			section3_count: record.section_21_30,
			section4_count: record.section_31_40,
			section5_count: record.section_41_45,
			// Keep original field names for calculations
			section_1_10: record.section_1_10,
			section_11_20: record.section_11_20,
			section_21_30: record.section_21_30,
			section_31_40: record.section_31_40,
			section_41_45: record.section_41_45,
		}));

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
		for (const statRecord of rawRecords) {
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
		const totalRecords = records.length;
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

		// 구간별 패턴 분포 계산
		const patternDistribution: Record<string, number> = {};
		for (const record of rawRecords) {
			const pattern = `${record.section_1_10}-${record.section_11_20}-${record.section_21_30}-${record.section_31_40}-${record.section_41_45}`;
			patternDistribution[pattern] = (patternDistribution[pattern] || 0) + 1;
		}

		// 구간별 평균 객체 생성
		const sectionAverages = {
			section1: sectionDistribution.section_1_10.average.toFixed(2),
			section2: sectionDistribution.section_11_20.average.toFixed(2),
			section3: sectionDistribution.section_21_30.average.toFixed(2),
			section4: sectionDistribution.section_31_40.average.toFixed(2),
			section5: sectionDistribution.section_41_45.average.toFixed(2),
		};

		// 구간별 총 개수 객체 생성
		const sectionCounts = {
			section1: sectionDistribution.section_1_10.total,
			section2: sectionDistribution.section_11_20.total,
			section3: sectionDistribution.section_21_30.total,
			section4: sectionDistribution.section_31_40.total,
			section5: sectionDistribution.section_41_45.total,
		};

		// 가장 빈번한 구간 찾기
		const mostFrequentSection = Object.entries(sectionCounts).sort(
			(a, b) => b[1] - a[1],
		)[0] || ["section1", 0];

		// 요약 객체 생성
		const summary = {
			sectionAverages,
			sectionCounts,
			totalDraws: totalRecords,
			distribution: patternDistribution,
			mostFrequentSection,
		};

		return {
			sectionStats: {
				records,
				summary,
			},
			totalRounds,
			selectedRounds,
			pageTitle: `구간 통계 (최근 ${selectedRounds}회차)`,
		};
	} catch (error) {
		console.error("구간 통계 데이터 로드 오류:", error);
		throw error;
	}
};

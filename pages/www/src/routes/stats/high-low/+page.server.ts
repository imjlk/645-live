import { env } from "$env/static/public";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.PUBLIC_TRAILBASE_URL || "http://localhost:4000");

// 페이지 옵션 설정 - 정적 페이지이므로 prerender 사용
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

		// 고저 분석 통계 데이터 조회 (배치 처리로 모든 데이터 가져오기)
		let allHighLowStats: Array<{
			round: number;
			low_count: number;
			high_count: number;
		}> = [];
		const batchSize = 1024;
		let batchOffset = 0;

		while (true) {
			const highLowStatsResponse = await client
				.records("lotto_draw_high_low_stats")
				.list({
					order: ["-round"],
					pagination: { limit: batchSize, offset: batchOffset },
				});

			const batchRecords = highLowStatsResponse.records as Array<{
				round: number;
				low_count: number;
				high_count: number;
			}>;

			if (batchRecords.length === 0) {
				break;
			}

			allHighLowStats = allHighLowStats.concat(batchRecords);
			batchOffset += batchSize;
		}

		// 고저 분포 분석
		const highLowDistribution = {
			"0": 0,
			"1": 0,
			"2": 0,
			"3": 0,
			"4": 0,
			"5": 0,
			"6": 0,
		};

		const lowCountDistribution = {
			"0": 0,
			"1": 0,
			"2": 0,
			"3": 0,
			"4": 0,
			"5": 0,
			"6": 0,
		};

		const highCountDistribution = {
			"0": 0,
			"1": 0,
			"2": 0,
			"3": 0,
			"4": 0,
			"5": 0,
			"6": 0,
		};

		let totalLowCount = 0;
		let totalHighCount = 0;
		const totalRecords = allHighLowStats.length;

		// 분포 계산
		for (const record of allHighLowStats) {
			const lowCount = record.low_count;
			const highCount = record.high_count;

			// 저번대 분포
			if (lowCount >= 0 && lowCount <= 6) {
				lowCountDistribution[
					lowCount.toString() as keyof typeof lowCountDistribution
				]++;
			}

			// 고번대 분포
			if (highCount >= 0 && highCount <= 6) {
				highCountDistribution[
					highCount.toString() as keyof typeof highCountDistribution
				]++;
			}

			// 고저 패턴별 분포 (저번대 기준)
			if (lowCount >= 0 && lowCount <= 6) {
				highLowDistribution[
					lowCount.toString() as keyof typeof highLowDistribution
				]++;
			}

			totalLowCount += lowCount;
			totalHighCount += highCount;
		}

		// 평균 계삵
		const averageLowCount =
			totalRecords > 0 ? (totalLowCount / totalRecords).toFixed(2) : "0.00";
		const averageHighCount =
			totalRecords > 0 ? (totalHighCount / totalRecords).toFixed(2) : "0.00";

		// 최근 패턴 분석 (최근 10회차)
		const recentStats = allHighLowStats.slice(0, 10).map((record) => {
			return {
				round: record.round,
				lowCount: record.low_count,
				highCount: record.high_count,
				pattern: getHighLowPattern(record.low_count, record.high_count),
			};
		});

		// 패턴별 통계
		const patternStats = {
			balanced: 0, // 3:3
			lowHeavy: 0, // 4:2, 5:1, 6:0
			highHeavy: 0, // 2:4, 1:5, 0:6
			extreme: 0, // 6:0, 0:6
		};

		for (const record of allHighLowStats) {
			const pattern = getHighLowPattern(record.low_count, record.high_count);

			if (pattern === "balanced") patternStats.balanced++;
			else if (pattern === "low-heavy") patternStats.lowHeavy++;
			else if (pattern === "high-heavy") patternStats.highHeavy++;
			else if (pattern === "extreme") patternStats.extreme++;
		}

		// 가장 빈번한 패턴 찾기
		const mostFrequentPattern = Object.entries(highLowDistribution)
			.filter(([_, count]) => count > 0)
			.sort((a, b) => b[1] - a[1])[0] || ["3", 0];

		return {
			highLowStats: allHighLowStats, // 전체 데이터 표시
			averageLowCount,
			averageHighCount,
			highLowDistribution,
			lowCountDistribution,
			highCountDistribution,
			recentStats,
			patternStats,
			totalRounds,
			totalRecords,
			mostFrequentPattern,
			selectedRounds: 0, // 기본값은 0 (전체 보기)
		};
	} catch (error) {
		console.error("고저 분석 통계 데이터 로드 실패:", error);
		return {
			highLowStats: [],
			averageLowCount: "0.00",
			averageHighCount: "0.00",
			highLowDistribution: {},
			lowCountDistribution: {},
			highCountDistribution: {},
			recentStats: [],
			patternStats: { balanced: 0, lowHeavy: 0, highHeavy: 0, extreme: 0 },
			totalRounds: 0,
			totalRecords: 0,
			mostFrequentPattern: ["3", 0],
			selectedRounds: 0,
		};
	}
};

function getHighLowPattern(lowCount: number, highCount: number): string {
	if (lowCount === 3 && highCount === 3) return "balanced";
	if (lowCount >= 4) return "low-heavy";
	if (highCount >= 4) return "high-heavy";
	if (lowCount === 0 || highCount === 0) return "extreme";
	return "normal";
}

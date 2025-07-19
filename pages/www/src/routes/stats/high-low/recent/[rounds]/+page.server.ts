import { env } from "$env/dynamic/public";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.PUBLIC_TRAILBASE_URL || "http://localhost:4000");

// 동적 페이지 설정
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

		// 고저 분석 통계 데이터 조회 (최신 N회차)
		const highLowStatsResponse = await client
			.records("lotto_draw_high_low_stats")
			.list({
				order: ["-round"],
				pagination: { limit: selectedRounds },
			});

		const records = highLowStatsResponse.records as Array<{
			round: number;
			low_count: number;
			high_count: number;
		}>;

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
		const totalRecords = records.length;

		// 분포 계산
		for (const record of records) {
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

		// 평균 계산
		const averageLowCount =
			totalRecords > 0 ? (totalLowCount / totalRecords).toFixed(2) : "0.00";
		const averageHighCount =
			totalRecords > 0 ? (totalHighCount / totalRecords).toFixed(2) : "0.00";

		// 최근 패턴 분석 (최근 10회차)
		const recentStats = records.slice(0, 10).map((record) => {
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

		for (const record of records) {
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

		// 고저 패턴별 분포 객체 생성 (저:고 형태)
		const patternDistribution: Record<string, number> = {};
		for (const [lowCount, count] of Object.entries(lowCountDistribution)) {
			if (count > 0) {
				const highCount = 6 - Number(lowCount);
				const pattern = `${lowCount}:${highCount}`;
				patternDistribution[pattern] = count;
			}
		}

		// 요약 객체 생성
		const summary = {
			lowAverage: averageLowCount,
			highAverage: averageHighCount,
			lowCount: totalLowCount,
			highCount: totalHighCount,
			totalDraws: totalRecords,
			distribution: patternDistribution,
			patternStats,
			mostFrequentPattern,
		};

		return {
			highLowStats: {
				records,
				summary,
			},
			totalRounds,
			selectedRounds,
			pageTitle: `고저 통계 (최근 ${selectedRounds}회차)`,
		};
	} catch (error) {
		console.error("고저 통계 데이터 로드 오류:", error);
		throw error;
	}
};

function getHighLowPattern(lowCount: number, highCount: number): string {
	if (lowCount === 3 && highCount === 3) return "balanced";
	if (lowCount >= 4) return "low-heavy";
	if (highCount >= 4) return "high-heavy";
	if (lowCount === 0 || highCount === 0) return "extreme";
	return "normal";
}

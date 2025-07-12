import { env } from "$env/dynamic/private";
import { initClient } from "trailbase";
import type { PageServerLoad } from "./$types";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get("page") || "1");
	const selectedRounds = Number(url.searchParams.get("rounds") || "500");
	const limit = 50;
	const offset = (page - 1) * limit;

	try {
		// 고저 분석 통계 데이터 (최신순)
		const highLowStatsResponse = await client
			.records("lotto_draw_high_low_stats")
			.list({
				order: ["-round"],
				pagination: { limit, offset },
			});

		// 전체 통계 데이터 (분석용, 선택된 회차 수만큼)
		const allStatsResponse = await client
			.records("lotto_draw_high_low_stats")
			.list({
				order: ["-round"],
				pagination: { limit: selectedRounds },
			});

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
		let totalRounds = 0;

		// 분포 계산
		for (const record of allStatsResponse.records) {
			const highLowRecord = record as { low_count: number; high_count: number };
			const lowCount = highLowRecord.low_count;
			const highCount = highLowRecord.high_count;

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
			totalRounds++;
		}

		// 평균 계산
		const averageLowCount =
			totalRounds > 0 ? (totalLowCount / totalRounds).toFixed(2) : "0.00";
		const averageHighCount =
			totalRounds > 0 ? (totalHighCount / totalRounds).toFixed(2) : "0.00";

		// 최근 패턴 분석 (최근 10회차)
		const recentStats = allStatsResponse.records.slice(0, 10).map((record) => {
			const r = record as {
				round: number;
				low_count: number;
				high_count: number;
			};
			return {
				round: r.round,
				lowCount: r.low_count,
				highCount: r.high_count,
				pattern: getHighLowPattern(r.low_count, r.high_count),
			};
		});

		// 패턴별 통계
		const patternStats = {
			balanced: 0, // 3:3
			lowHeavy: 0, // 4:2, 5:1, 6:0
			highHeavy: 0, // 2:4, 1:5, 0:6
			extreme: 0, // 6:0, 0:6
		};

		for (const record of allStatsResponse.records) {
			const r = record as { low_count: number; high_count: number };
			const pattern = getHighLowPattern(r.low_count, r.high_count);

			if (pattern === "balanced") patternStats.balanced++;
			else if (pattern === "low-heavy") patternStats.lowHeavy++;
			else if (pattern === "high-heavy") patternStats.highHeavy++;
			else if (pattern === "extreme") patternStats.extreme++;
		}

		return {
			highLowStats: highLowStatsResponse.records,
			averageLowCount,
			averageHighCount,
			highLowDistribution,
			lowCountDistribution,
			highCountDistribution,
			recentStats,
			patternStats,
			totalRounds,
			currentPage: page,
			totalPages: Math.ceil((highLowStatsResponse.total_count || 0) / limit),
			selectedRounds,
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
			currentPage: 1,
			totalPages: 1,
			selectedRounds,
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

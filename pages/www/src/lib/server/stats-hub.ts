import {
	getBonusAnalysis,
	getLatestRoundInfo,
	getNumberStats,
	getPairStats,
	getRecentColorStats,
	getRecentOddEvenStats,
	getStatsForAnalysisType,
	type ACStat,
	type HighLowStat,
	type OddEvenStat,
} from "$lib/trailbase/stats";
import {
	getStatsFreshness,
	type StatsFreshness,
} from "$lib/trailbase/stats-freshness";

function getRecordNumber(record: unknown, key: string): number {
	if (!record || typeof record !== "object") {
		return 0;
	}

	const value = (record as Record<string, unknown>)[key];
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getDominantPattern(records: unknown[], leftKey: string, rightKey: string): string {
	const counts = new Map<string, number>();

	for (const record of records) {
		const left = getRecordNumber(record, leftKey);
		const right = getRecordNumber(record, rightKey);
		const key = `${left}:${right}`;
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "3:3";
}

function countExtremePatterns(
	records: unknown[],
	leftKey: string,
	rightKey: string,
): number {
	return records.filter((record) => {
		const left = getRecordNumber(record, leftKey);
		const right = getRecordNumber(record, rightKey);
		return Math.max(left, right) >= 5;
	}).length;
}

function classifyAcRange(ac: number): "low" | "mid" | "high" {
	if (ac <= 5) return "low";
	if (ac <= 10) return "mid";
	return "high";
}

function buildRecent10Summary(
	oddEvenStats: OddEvenStat[],
	highLowStats: HighLowStat[],
): string {
	const dominantOddEven = getDominantPattern(oddEvenStats, "odd_count", "even_count");
	const dominantHighLow = getDominantPattern(highLowStats, "low_count", "high_count");
	const extremeCount =
		countExtremePatterns(oddEvenStats, "odd_count", "even_count") +
		countExtremePatterns(highLowStats, "low_count", "high_count");

	return `홀짝은 ${dominantOddEven} 조합이 중심이고, 고저는 ${dominantHighLow} 범위가 많았습니다. 극단적으로 한쪽에 치우친 패턴은 ${extremeCount > 3 ? "일부 보였지만 제한적이었습니다." : "드물었습니다."}`;
}

function buildRecent50Summary(
	oddEvenStats: OddEvenStat[],
	highLowStats: HighLowStat[],
): string {
	const dominantOddEven = getDominantPattern(oddEvenStats, "odd_count", "even_count");
	const dominantHighLow = getDominantPattern(highLowStats, "low_count", "high_count");

	return `최근 50회에서는 홀짝 ${dominantOddEven}, 고저 ${dominantHighLow} 조합이 상대적으로 자주 나타났습니다. 한쪽으로 크게 치우친 조합은 중심 패턴이 아니었습니다.`;
}

function buildRecent100Summary(acStats: ACStat[]): string {
	const distribution = { low: 0, mid: 0, high: 0 };

	for (const stat of acStats) {
		distribution[classifyAcRange(stat.ac_value)] += 1;
	}

	const dominantBucket = Object.entries(distribution).sort((a, b) => b[1] - a[1])[0]?.[0];

	if (dominantBucket === "high") {
		return "AC값은 중간 이상 복잡도 구간이 중심이었고, 번호 간격이 비교적 고르게 퍼진 조합이 많았습니다.";
	}

	if (dominantBucket === "low") {
		return "AC값은 낮은 복잡도 구간이 중심이었고, 연속성이나 규칙성이 보이는 조합이 상대적으로 많았습니다.";
	}

	return "AC값은 중간 복잡도 구간이 중심이었고, 지나치게 단순하거나 과도하게 분산된 조합은 상대적으로 적었습니다.";
}

function buildOverallSummary(
	totalRounds: number,
	topNumberStats: Array<{ number: number; draw_count: number }>,
	bottomNumberStats: Array<{ number: number; draw_count: number }>,
): string {
	const mostFrequent = topNumberStats[0];
	const leastFrequent = bottomNumberStats[0];

	if (!mostFrequent || !leastFrequent) {
		return `전체 ${totalRounds}회차 기준으로 자주 나온 번호와 적게 나온 번호의 차이를 한눈에 비교할 수 있습니다.`;
	}

	return `전체 ${totalRounds}회차 기준으로 ${mostFrequent.number}번이 ${mostFrequent.draw_count}회로 가장 자주 나왔고, ${leastFrequent.number}번은 ${leastFrequent.draw_count}회로 상대적으로 적게 나왔습니다.`;
}

function createFallbackFreshness(): StatsFreshness {
	return {
		latestRound: 0,
		latestDrawDate: "",
		analysisRound: 0,
		isStale: false,
		lastUpdatedAt: null,
		sourceLabel: "통계 데이터",
	};
}

export async function getStatsHubData() {
	try {
		const latestRoundInfo = await getLatestRoundInfo();
		const latestRound = latestRoundInfo?.round || 0;
		const latestDrawDate = latestRoundInfo?.draw_date || "";
		const totalRounds = latestRound;

		const [
			topNumberStats,
			bottomNumberStats,
			recentOddEvenStats,
			recentColorStats,
			recentSectionStats,
			recentHighLowStats,
			topPairStats,
			bonusAnalysis,
			oddEven50,
			highLow50,
			ac100,
			freshness,
		] = await Promise.all([
			getNumberStats("desc", 10),
			getNumberStats("asc", 10),
			getRecentOddEvenStats(10),
			getRecentColorStats(10),
			getStatsForAnalysisType("sections", 10),
			getStatsForAnalysisType("high-low", 10),
			getPairStats(10),
			getBonusAnalysis(),
			getStatsForAnalysisType("odd-even", 50) as Promise<OddEvenStat[]>,
			getStatsForAnalysisType("high-low", 50) as Promise<HighLowStat[]>,
			getStatsForAnalysisType("ac", 100) as Promise<ACStat[]>,
			getStatsFreshness([
				{
					tableName: "lotto_number_stats",
					sourceLabel: "번호별 통계",
					orderField: "last_draw_round",
					roundField: "last_draw_round",
				},
				{
					tableName: "lotto_draw_odd_even_stats",
					sourceLabel: "홀짝 통계",
				},
				{
					tableName: "lotto_draw_color_stats",
					sourceLabel: "색상 통계",
				},
				{
					tableName: "lotto_draw_section_stats",
					sourceLabel: "구간 통계",
				},
				{
					tableName: "lotto_draw_high_low_stats",
					sourceLabel: "고저 통계",
				},
				{
					tableName: "lotto_draw_ac_stats",
					sourceLabel: "AC 통계",
				},
				{
					tableName: "lotto_draw_bonus_stats",
					sourceLabel: "보너스 통계",
				},
				{
					tableName: "lotto_bonus_number_stats",
					sourceLabel: "보너스 번호 통계",
					orderField: "last_bonus_round",
					roundField: "last_bonus_round",
				},
			]),
		]);

		return {
			latestRound,
			latestDrawDate,
			totalRounds,
			topNumberStats,
			bottomNumberStats,
			recentOddEvenStats,
			recentColorStats,
			recentSectionStats,
			recentHighLowStats,
			topPairStats,
			bonusAnalysis,
			freshness,
			summarySnapshots: {
				recent10: buildRecent10Summary(
					recentOddEvenStats,
					recentHighLowStats as HighLowStat[],
				),
				recent50: buildRecent50Summary(oddEven50, highLow50),
				recent100: buildRecent100Summary(ac100),
				overall: buildOverallSummary(totalRounds, topNumberStats, bottomNumberStats),
			},
		};
	} catch (error) {
		console.error("Error loading stats hub data:", error);

		return {
			latestRound: 0,
			latestDrawDate: "",
			totalRounds: 0,
			topNumberStats: [],
			bottomNumberStats: [],
			recentOddEvenStats: [],
			recentColorStats: [],
			recentSectionStats: [],
			recentHighLowStats: [],
			topPairStats: [],
			bonusAnalysis: null,
			freshness: createFallbackFreshness(),
			summarySnapshots: {
				recent10: "최근 10회 요약 데이터를 불러오지 못했습니다.",
				recent50: "최근 50회 요약 데이터를 불러오지 못했습니다.",
				recent100: "최근 100회 요약 데이터를 불러오지 못했습니다.",
				overall: "전체 통계 요약 데이터를 불러오지 못했습니다.",
			},
		};
	}
}

export type StatsHubData = Awaited<ReturnType<typeof getStatsHubData>>;

export function getPublicStatsOverview(data: StatsHubData) {
	return {
		latestRound: data.latestRound,
		latestDrawDate: data.latestDrawDate,
		totalRounds: data.totalRounds,
		topNumbers: data.topNumberStats.slice(0, 5),
		lowestNumbers: data.bottomNumberStats.slice(0, 5),
		topPairs: data.topPairStats.slice(0, 5),
		bonusSummary: data.bonusAnalysis
			? {
					topBonusNumber: data.bonusAnalysis.topBonusNumber,
					latestBonusDraw: data.bonusAnalysis.latestBonusDraw,
				}
			: null,
		freshness: data.freshness,
		summaries: data.summarySnapshots,
	};
}

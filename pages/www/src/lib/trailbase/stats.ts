/**
 * TrailBase Stats API helpers
 * Centralized data fetching for statistics pages
 */

import { PUBLIC_TRAILBASE_URL } from "$env/static/public";
import { initClient } from "trailbase";

const client = initClient(PUBLIC_TRAILBASE_URL || "http://localhost:4000");

// Common types for stats
export interface LatestRoundInfo {
	round: number;
	draw_date: string;
}

export interface NumberStat {
	number: number;
	draw_count: number;
	bonus_count: number;
	color: string;
	section: number;
	average_frequency: string;
	deviation: string;
	last_draw_round: number | null;
}

export interface OddEvenStat {
	round: number;
	odd_count: number;
	even_count: number;
}

export interface ColorStat {
	round: number;
	yellow_count: number;
	blue_count: number;
	red_count: number;
	grey_count: number;
	green_count: number;
}

export interface PairStat {
	number_a: number;
	number_b: number;
	pair_count: number;
}

export interface SectionStat {
	round: number;
	section_1_10: number;
	section_11_20: number;
	section_21_30: number;
	section_31_40: number;
	section_41_45: number;
}

export interface ACStat {
	round: number;
	ac_value: number;
}

export interface UnitDigitStat {
	round: number;
	digit_0_count: number;
	digit_1_count: number;
	digit_2_count: number;
	digit_3_count: number;
	digit_4_count: number;
	digit_5_count: number;
	digit_6_count: number;
	digit_7_count: number;
	digit_8_count: number;
	digit_9_count: number;
}

export interface HighLowStat {
	round: number;
	low_count: number;
	high_count: number;
}

export interface RepeatStat {
	round: number;
	repeat_count: number;
}

// Latest round information
export async function getLatestRoundInfo(): Promise<LatestRoundInfo | null> {
	try {
		const response = await client.records("lotto_draw_results").list({
			order: ["-round"],
			pagination: { limit: 1 },
		});

		if (response.records.length > 0) {
			const latest = response.records[0] as unknown as LatestRoundInfo;
			return {
				round: latest.round,
				draw_date: latest.draw_date,
			};
		}
		return null;
	} catch (error) {
		console.error("Failed to fetch latest round info:", error);
		return null;
	}
}

// Number statistics
export async function getNumberStats(
	order: "asc" | "desc" = "desc",
	limit?: number,
): Promise<NumberStat[]> {
	try {
		const sortOrder = order === "desc" ? ["-draw_count"] : ["draw_count"];
		const response = await client.records("lotto_number_stats").list({
			order: sortOrder,
			pagination: limit ? { limit } : undefined,
		});
		return response.records as unknown as NumberStat[];
	} catch (error) {
		console.error("Failed to fetch number stats:", error);
		return [];
	}
}

// Recent odd/even statistics
export async function getRecentOddEvenStats(
	limit = 10,
): Promise<OddEvenStat[]> {
	try {
		const response = await client.records("lotto_draw_odd_even_stats").list({
			order: ["-round"],
			pagination: { limit },
		});
		return response.records as unknown as OddEvenStat[];
	} catch (error) {
		console.error("Failed to fetch odd/even stats:", error);
		return [];
	}
}

// Recent color statistics
export async function getRecentColorStats(limit = 10): Promise<ColorStat[]> {
	try {
		const response = await client.records("lotto_draw_color_stats").list({
			order: ["-round"],
			pagination: { limit },
		});
		return response.records as unknown as ColorStat[];
	} catch (error) {
		console.error("Failed to fetch color stats:", error);
		return [];
	}
}

// Pair statistics
export async function getPairStats(limit = 10): Promise<PairStat[]> {
	try {
		const response = await client.records("lotto_number_pair_stats").list({
			order: ["-pair_count"],
			pagination: { limit },
		});
		return response.records as unknown as PairStat[];
	} catch (error) {
		console.error("Failed to fetch pair stats:", error);
		return [];
	}
}

// Color averages and distribution
export async function getColorAveragesAndDistribution(): Promise<{
	colorAverages: Record<string, string>;
	colorCountDistribution: Record<string, Record<string, number>>;
	totalRecords: number;
	mostFrequentColor: [string, string];
	lowComplexityRate: string;
	highComplexityRate: string;
}> {
	try {
		// Get all color stats with batch processing
		let allColorStats: ColorStat[] = [];

		const batchSize = 1024;
		let batchOffset = 0;

		while (true) {
			const response = await client.records("lotto_draw_color_stats").list({
				order: ["-round"],
				pagination: { limit: batchSize, offset: batchOffset },
			});

			const batchRecords = response.records as unknown as ColorStat[];

			if (batchRecords.length === 0) {
				break;
			}

			allColorStats = allColorStats.concat(batchRecords);
			batchOffset += batchSize;
		}

		const records = allColorStats;
		const totalRecords = records.length;

		if (totalRecords === 0) {
			return {
				colorAverages: {},
				colorCountDistribution: {},
				totalRecords: 0,
				mostFrequentColor: ["", "0"],
				lowComplexityRate: "0",
				highComplexityRate: "0",
			};
		}

		// Calculate averages
		const colorSums = {
			yellow: 0,
			blue: 0,
			red: 0,
			grey: 0,
			green: 0,
		};

		// Distribution tracking
		const distribution: Record<string, Record<string, number>> = {
			yellow: {},
			blue: {},
			red: {},
			grey: {},
			green: {},
		};

		let lowComplexityCount = 0;
		let highComplexityCount = 0;

		records.forEach((record) => {
			colorSums.yellow += record.yellow_count;
			colorSums.blue += record.blue_count;
			colorSums.red += record.red_count;
			colorSums.grey += record.grey_count;
			colorSums.green += record.green_count;

			// Track distributions
			Object.entries({
				yellow: record.yellow_count,
				blue: record.blue_count,
				red: record.red_count,
				grey: record.grey_count,
				green: record.green_count,
			}).forEach(([color, count]) => {
				const countStr = count.toString();
				if (!distribution[color][countStr]) {
					distribution[color][countStr] = 0;
				}
				distribution[color][countStr]++;
			});

			// Complexity analysis
			const maxCount = Math.max(
				record.yellow_count,
				record.blue_count,
				record.red_count,
				record.grey_count,
				record.green_count,
			);
			const minCount = Math.min(
				record.yellow_count,
				record.blue_count,
				record.red_count,
				record.grey_count,
				record.green_count,
			);

			if (maxCount <= 1) lowComplexityCount++;
			if (maxCount >= 4) highComplexityCount++;
		});

		// Calculate averages
		const colorAverages = Object.fromEntries(
			Object.entries(colorSums).map(([color, sum]) => [
				color,
				(sum / totalRecords).toFixed(2),
			]),
		);

		// Find most frequent color
		const mostFrequentColorEntry = Object.entries(colorAverages).reduce(
			(max, [color, avg]) =>
				Number.parseFloat(avg) > Number.parseFloat(max[1]) ? [color, avg] : max,
			["", "0"],
		);

		return {
			colorAverages,
			colorCountDistribution: distribution,
			totalRecords,
			mostFrequentColor: mostFrequentColorEntry,
			lowComplexityRate: ((lowComplexityCount / totalRecords) * 100).toFixed(1),
			highComplexityRate: ((highComplexityCount / totalRecords) * 100).toFixed(
				1,
			),
		};
	} catch (error) {
		console.error("Failed to fetch color averages and distribution:", error);
		return {
			colorAverages: {},
			colorCountDistribution: {},
			totalRecords: 0,
			mostFrequentColor: ["", "0"],
			lowComplexityRate: "0",
			highComplexityRate: "0",
		};
	}
}

// Generic stats loader for different analysis types
export async function getStatsForAnalysisType(
	analysisType: string,
	limit?: number,
): Promise<
	| SectionStat[]
	| ACStat[]
	| UnitDigitStat[]
	| HighLowStat[]
	| RepeatStat[]
	| OddEvenStat[]
	| ColorStat[]
> {
	try {
		const tableMap: Record<string, string> = {
			"odd-even": "lotto_draw_odd_even_stats",
			colors: "lotto_draw_color_stats",
			sections: "lotto_draw_section_stats",
			"high-low": "lotto_draw_high_low_stats",
			repeat: "lotto_draw_repeat_stats",
			"unit-digit": "lotto_draw_unit_digit_stats",
			ac: "lotto_draw_ac_stats",
		};

		const tableName = tableMap[analysisType];
		if (!tableName) {
			console.warn(`Unknown analysis type: ${analysisType}`);
			return [];
		}

		// If a limit is specified and it's within the TrailBase limit, use direct query
		if (limit && limit <= 1024) {
			const response = await client.records(tableName).list({
				order: ["-round"],
				pagination: { limit },
			});
			return response.records;
		}

		// Otherwise, use batch processing to get all records or the specified limit
		let allRecords: (
			| SectionStat
			| ACStat
			| UnitDigitStat
			| HighLowStat
			| RepeatStat
			| OddEvenStat
			| ColorStat
		)[] = [];
		const batchSize = 1024;
		let batchOffset = 0;
		let totalFetched = 0;

		while (true) {
			const currentBatchSize =
				limit && totalFetched + batchSize > limit
					? limit - totalFetched
					: batchSize;

			const response = await client.records(tableName).list({
				order: ["-round"],
				pagination: { limit: currentBatchSize, offset: batchOffset },
			});

			if (response.records.length === 0) {
				break;
			}

			allRecords = allRecords.concat(response.records);
			totalFetched += response.records.length;
			batchOffset += currentBatchSize;

			// If we have a limit and reached it, break
			if (limit && totalFetched >= limit) {
				break;
			}

			// If the batch returned fewer records than requested, we've reached the end
			if (response.records.length < currentBatchSize) {
				break;
			}
		}

		return allRecords;
	} catch (error) {
		console.error(`Failed to fetch stats for ${analysisType}:`, error);
		return [];
	}
}

// Odd/Even specific analysis
export async function getOddEvenAnalysis(): Promise<{
	oddEvenStats: OddEvenStat[];
	totalRecords: number;
	oddEvenDistribution: Record<string, number>;
	sumDistribution: Record<string, number>;
	averageOddCount: string;
	averageEvenCount: string;
	mostFrequentPattern: [string, number];
	balancedRate: string;
	extremeRate: string;
}> {
	try {
		// Get all odd/even stats with batch processing
		let allOddEvenStats: Array<{
			round: number;
			odd_count: number;
			even_count: number;
			numbers_sum: number;
		}> = [];

		const batchSize = 1024;
		let batchOffset = 0;

		while (true) {
			const response = await client.records("lotto_draw_odd_even_stats").list({
				order: ["-round"],
				pagination: { limit: batchSize, offset: batchOffset },
			});

			const batchRecords = response.records as Array<{
				round: number;
				odd_count: number;
				even_count: number;
				numbers_sum: number;
			}>;

			if (batchRecords.length === 0) {
				break;
			}

			allOddEvenStats = allOddEvenStats.concat(batchRecords);
			batchOffset += batchSize;
		}

		// Calculate distributions
		const oddEvenDistribution: Record<string, number> = {
			"0": 0,
			"1": 0,
			"2": 0,
			"3": 0,
			"4": 0,
			"5": 0,
			"6": 0,
		};

		const sumDistribution: Record<string, number> = {
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

		// Process data
		for (const stat of allOddEvenStats) {
			// Odd count distribution
			if (stat.odd_count >= 0 && stat.odd_count <= 6) {
				oddEvenDistribution[stat.odd_count.toString()]++;
			}

			// Sum distribution
			const sum = stat.numbers_sum;
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

		// Calculate statistics
		const totalRecords = allOddEvenStats.length;
		const oddCounts = allOddEvenStats.map((r) => r.odd_count);
		const evenCounts = allOddEvenStats.map((r) => r.even_count);

		const averageOddCount =
			totalRecords > 0
				? (oddCounts.reduce((sum, val) => sum + val, 0) / totalRecords).toFixed(
						2,
					)
				: "0.00";
		const averageEvenCount =
			totalRecords > 0
				? (
						evenCounts.reduce((sum, val) => sum + val, 0) / totalRecords
					).toFixed(2)
				: "0.00";

		// Most frequent pattern
		const mostFrequentPattern = Object.entries(oddEvenDistribution)
			.filter(([_, count]) => count > 0)
			.sort((a, b) => b[1] - a[1])[0] || ["3", 0];

		// Balance analysis
		const balancedCount = oddEvenDistribution["3"] || 0;
		const extremeCount =
			(oddEvenDistribution["0"] || 0) + (oddEvenDistribution["6"] || 0);

		const balancedRate =
			totalRecords > 0
				? ((balancedCount / totalRecords) * 100).toFixed(1)
				: "0.0";
		const extremeRate =
			totalRecords > 0
				? ((extremeCount / totalRecords) * 100).toFixed(1)
				: "0.0";

		return {
			oddEvenStats: allOddEvenStats as OddEvenStat[],
			totalRecords,
			oddEvenDistribution,
			sumDistribution,
			averageOddCount,
			averageEvenCount,
			mostFrequentPattern: mostFrequentPattern as [string, number],
			balancedRate,
			extremeRate,
		};
	} catch (error) {
		console.error("Failed to fetch odd/even analysis:", error);
		return {
			oddEvenStats: [],
			totalRecords: 0,
			oddEvenDistribution: {},
			sumDistribution: {},
			averageOddCount: "0.00",
			averageEvenCount: "0.00",
			mostFrequentPattern: ["3", 0],
			balancedRate: "0.0",
			extremeRate: "0.0",
		};
	}
}

// Pairs analysis
export async function getPairsAnalysis(): Promise<{
	pairStats: PairStat[];
	totalPairs: number;
	maxPairCount: number;
	minPairCount: number;
	averagePairCount: string;
	topNumbersByPairCount: [number, number][];
	pairCountDistribution: Record<string, number>;
}> {
	try {
		// Get all pair stats with batch processing
		let allPairStats: Array<{
			id: number;
			number_a: number;
			number_b: number;
			pair_count: number;
		}> = [];

		const batchSize = 1024;
		let batchOffset = 0;

		while (true) {
			const response = await client.records("lotto_number_pair_stats").list({
				order: ["-pair_count", "number_a", "number_b"],
				pagination: { limit: batchSize, offset: batchOffset },
			});

			const batchRecords = response.records as Array<{
				id: number;
				number_a: number;
				number_b: number;
				pair_count: number;
			}>;

			if (batchRecords.length === 0) {
				break;
			}

			allPairStats = allPairStats.concat(batchRecords);
			batchOffset += batchSize;
		}

		// Calculate statistics
		const pairCounts = allPairStats.map((record) => record.pair_count);
		const totalPairs = allPairStats.length;
		const maxPairCount = pairCounts.length > 0 ? Math.max(...pairCounts) : 0;
		const minPairCount = pairCounts.length > 0 ? Math.min(...pairCounts) : 0;
		const averagePairCount =
			totalPairs > 0
				? (
						pairCounts.reduce((sum, count) => sum + count, 0) / totalPairs
					).toFixed(2)
				: "0.00";

		// Number total pair counts
		const numberTotalPairCounts = new Map<number, number>();
		for (const record of allPairStats) {
			const currentA = numberTotalPairCounts.get(record.number_a) || 0;
			const currentB = numberTotalPairCounts.get(record.number_b) || 0;
			numberTotalPairCounts.set(record.number_a, currentA + record.pair_count);
			numberTotalPairCounts.set(record.number_b, currentB + record.pair_count);
		}

		const topNumbersByPairCount = Array.from(numberTotalPairCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10);

		// Distribution analysis
		const pairCountDistribution: Record<string, number> = {
			"0-5": 0,
			"6-10": 0,
			"11-15": 0,
			"16-20": 0,
			"21-25": 0,
			"26-30": 0,
			"31+": 0,
		};

		for (const count of pairCounts) {
			if (count <= 5) pairCountDistribution["0-5"]++;
			else if (count <= 10) pairCountDistribution["6-10"]++;
			else if (count <= 15) pairCountDistribution["11-15"]++;
			else if (count <= 20) pairCountDistribution["16-20"]++;
			else if (count <= 25) pairCountDistribution["21-25"]++;
			else if (count <= 30) pairCountDistribution["26-30"]++;
			else pairCountDistribution["31+"]++;
		}

		return {
			pairStats: allPairStats as PairStat[],
			totalPairs,
			maxPairCount,
			minPairCount,
			averagePairCount,
			topNumbersByPairCount,
			pairCountDistribution,
		};
	} catch (error) {
		console.error("Failed to fetch pairs analysis:", error);
		return {
			pairStats: [],
			totalPairs: 0,
			maxPairCount: 0,
			minPairCount: 0,
			averagePairCount: "0.00",
			topNumbersByPairCount: [],
			pairCountDistribution: {},
		};
	}
}

// Generic batch fetch for any analysis type with recent data
export async function getAnalysisWithRecent(
	analysisType: string,
	limit?: number,
): Promise<{
	analysisData:
		| SectionStat[]
		| ACStat[]
		| UnitDigitStat[]
		| HighLowStat[]
		| RepeatStat[]
		| OddEvenStat[]
		| ColorStat[];
	recentStats:
		| SectionStat[]
		| ACStat[]
		| UnitDigitStat[]
		| HighLowStat[]
		| RepeatStat[]
		| OddEvenStat[]
		| ColorStat[];
	totalRounds: number;
}> {
	try {
		const [latestRoundInfo, analysisData, recentStats] = await Promise.all([
			getLatestRoundInfo(),
			getStatsForAnalysisType(analysisType, limit),
			getStatsForAnalysisType(analysisType, 10), // Recent 10 rounds
		]);

		return {
			analysisData,
			recentStats,
			totalRounds: latestRoundInfo?.round || 0,
		};
	} catch (error) {
		console.error(`Failed to fetch analysis for ${analysisType}:`, error);
		return {
			analysisData: [],
			recentStats: [],
			totalRounds: 0,
		};
	}
}

// Recent rounds analysis for dynamic routes
export async function getRecentAnalysis(
	analysisType: string,
	rounds: number,
): Promise<{
	analysisData:
		| SectionStat[]
		| ACStat[]
		| UnitDigitStat[]
		| HighLowStat[]
		| RepeatStat[]
		| OddEvenStat[]
		| ColorStat[];
	selectedRounds: number;
	totalRounds: number;
	validRounds: boolean;
}> {
	try {
		// Validate rounds parameter
		if (Number.isNaN(rounds) || rounds < 1) {
			throw new Error("잘못된 회차 파라미터입니다.");
		}

		// Get latest round info and recent data in parallel
		const [latestRoundInfo, recentData] = await Promise.all([
			getLatestRoundInfo(),
			getStatsForAnalysisType(analysisType, rounds),
		]);

		const totalRounds = latestRoundInfo?.round || 0;
		const validRounds = rounds <= totalRounds;

		if (!validRounds) {
			throw new Error(
				`선택한 회차 수(${rounds})가 전체 회차 수(${totalRounds})를 초과합니다.`,
			);
		}

		return {
			analysisData: recentData,
			selectedRounds: rounds,
			totalRounds,
			validRounds,
		};
	} catch (error) {
		console.error(
			`Failed to fetch recent analysis for ${analysisType}:`,
			error,
		);

		// Get total rounds for fallback
		const latestRoundInfo = await getLatestRoundInfo();
		const totalRounds = latestRoundInfo?.round || 0;

		return {
			analysisData: [],
			selectedRounds: rounds,
			totalRounds,
			validRounds: false,
		};
	}
}

// Recent color analysis (specialized version with detailed calculations)
export async function getRecentColorAnalysis(rounds: number) {
	try {
		const baseResult = await getRecentAnalysis("colors", rounds);

		if (!baseResult.validRounds || baseResult.analysisData.length === 0) {
			return {
				...baseResult,
				colorAverages: {
					yellow: "0.00",
					blue: "0.00",
					red: "0.00",
					grey: "0.00",
					green: "0.00",
				},
				colorCountDistribution: {
					yellow: {},
					blue: {},
					red: {},
					grey: {},
					green: {},
				},
				mostFrequentColor: ["yellow", "0.00"],
				lowComplexityRate: "0.0",
				highComplexityRate: "0.0",
				summary: {
					distribution: {},
				},
			};
		}

		// Calculate color-specific analysis similar to getColorAveragesAndDistribution
		const colorStats = baseResult.analysisData as ColorStat[];
		const totalRecords = colorStats.length;

		const colorSums = { yellow: 0, blue: 0, red: 0, grey: 0, green: 0 };
		const distribution: Record<string, Record<string, number>> = {
			yellow: {},
			blue: {},
			red: {},
			grey: {},
			green: {},
		};
		const patternDistribution: Record<string, number> = {};

		let lowComplexityCount = 0;
		let highComplexityCount = 0;

		colorStats.forEach((record) => {
			colorSums.yellow += record.yellow_count;
			colorSums.blue += record.blue_count;
			colorSums.red += record.red_count;
			colorSums.grey += record.grey_count;
			colorSums.green += record.green_count;

			// Track distributions
			Object.entries({
				yellow: record.yellow_count,
				blue: record.blue_count,
				red: record.red_count,
				grey: record.grey_count,
				green: record.green_count,
			}).forEach(([color, count]) => {
				const countStr = count.toString();
				if (!distribution[color][countStr]) {
					distribution[color][countStr] = 0;
				}
				distribution[color][countStr]++;
			});

			// Create pattern for this record
			const pattern = `${record.yellow_count || 0}-${record.blue_count || 0}-${record.red_count || 0}-${record.grey_count || 0}-${record.green_count || 0}`;
			patternDistribution[pattern] = (patternDistribution[pattern] || 0) + 1;

			// Complexity analysis
			const maxCount = Math.max(
				record.yellow_count,
				record.blue_count,
				record.red_count,
				record.grey_count,
				record.green_count,
			);
			if (maxCount <= 1) lowComplexityCount++;
			if (maxCount >= 4) highComplexityCount++;
		});

		// Calculate averages
		const colorAverages = Object.fromEntries(
			Object.entries(colorSums).map(([color, sum]) => [
				color,
				(sum / totalRecords).toFixed(2),
			]),
		);

		const mostFrequentColor = Object.entries(colorAverages).reduce(
			(max, [color, avg]) =>
				Number.parseFloat(avg) > Number.parseFloat(max[1]) ? [color, avg] : max,
			["", "0"],
		);

		return {
			...baseResult,
			colorAverages,
			colorCountDistribution: distribution,
			mostFrequentColor: mostFrequentColor as [string, string],
			lowComplexityRate: ((lowComplexityCount / totalRecords) * 100).toFixed(1),
			highComplexityRate: ((highComplexityCount / totalRecords) * 100).toFixed(
				1,
			),
			summary: {
				distribution: patternDistribution,
			},
		};
	} catch (error) {
		console.error("Failed to fetch recent color analysis:", error);
		const latestRoundInfo = await getLatestRoundInfo();
		return {
			analysisData: [],
			selectedRounds: rounds,
			totalRounds: latestRoundInfo?.round || 0,
			validRounds: false,
			colorAverages: {
				yellow: "0.00",
				blue: "0.00",
				red: "0.00",
				grey: "0.00",
				green: "0.00",
			},
			colorCountDistribution: {
				yellow: {},
				blue: {},
				red: {},
				grey: {},
				green: {},
			},
			mostFrequentColor: ["yellow", "0.00"] as [string, string],
			lowComplexityRate: "0.0",
			highComplexityRate: "0.0",
			summary: {
				distribution: {},
			},
		};
	}
}

// AC 분석을 위한 특화 함수
export async function getRecentACAnalysis(rounds: number) {
	try {
		const baseResult = await getRecentAnalysis("ac", rounds);

		if (!baseResult.validRounds || baseResult.analysisData.length === 0) {
			return {
				...baseResult,
				summary: {
					avgAC: 0,
					maxAC: 0,
					minAC: 0,
					totalDraws: 0,
					distribution: {},
				},
				records: [],
			};
		}

		const records = baseResult.analysisData;
		const acValues = records.map((record) => record.ac_value);

		const avgAC = acValues.reduce((sum, val) => sum + val, 0) / acValues.length;
		const maxAC = Math.max(...acValues);
		const minAC = Math.min(...acValues);

		// AC값 분포 계산
		const distribution: Record<string, number> = {};
		acValues.forEach((ac) => {
			const range = getACRange(ac);
			distribution[range] = (distribution[range] || 0) + 1;
		});

		return {
			...baseResult,
			summary: {
				avgAC,
				maxAC,
				minAC,
				totalDraws: records.length,
				distribution,
			},
			records,
		};
	} catch (error) {
		console.error("Failed to fetch recent AC analysis:", error);
		const latestRoundInfo = await getLatestRoundInfo();
		return {
			analysisData: [],
			selectedRounds: rounds,
			totalRounds: latestRoundInfo?.round || 0,
			validRounds: false,
			summary: {
				avgAC: 0,
				maxAC: 0,
				minAC: 0,
				totalDraws: 0,
				distribution: {},
			},
			records: [],
		};
	}
}

// Unit-digit 분석을 위한 특화 함수
export async function getRecentUnitDigitAnalysis(rounds: number) {
	try {
		const latestRoundInfo = await getLatestRoundInfo();
		const totalRounds = latestRoundInfo?.round || 0;

		if (rounds <= 0 || rounds > totalRounds) {
			return {
				validRounds: false,
				selectedRounds: rounds,
				totalRounds,
				summary: {
					digitAverages: {
						digit0: "0.00",
						digit1: "0.00",
						digit2: "0.00",
						digit3: "0.00",
						digit4: "0.00",
						digit5: "0.00",
						digit6: "0.00",
						digit7: "0.00",
						digit8: "0.00",
						digit9: "0.00",
					},
					digitCounts: {
						digit0: 0,
						digit1: 0,
						digit2: 0,
						digit3: 0,
						digit4: 0,
						digit5: 0,
						digit6: 0,
						digit7: 0,
						digit8: 0,
						digit9: 0,
					},
					mostFrequentDigit: [0, 0],
					totalDraws: 0,
					distribution: {},
				},
				records: [],
			};
		}

		// Get recent unit-digit stats directly from database
		const response = await client.records("lotto_draw_unit_digit_stats").list({
			order: ["-round"],
			pagination: { limit: rounds },
		});

		const records = response.records as UnitDigitStat[];

		if (records.length === 0) {
			return {
				validRounds: true,
				selectedRounds: rounds,
				totalRounds,
				summary: {
					digitAverages: {
						digit0: "0.00",
						digit1: "0.00",
						digit2: "0.00",
						digit3: "0.00",
						digit4: "0.00",
						digit5: "0.00",
						digit6: "0.00",
						digit7: "0.00",
						digit8: "0.00",
						digit9: "0.00",
					},
					digitCounts: {
						digit0: 0,
						digit1: 0,
						digit2: 0,
						digit3: 0,
						digit4: 0,
						digit5: 0,
						digit6: 0,
						digit7: 0,
						digit8: 0,
						digit9: 0,
					},
					mostFrequentDigit: [0, 0],
					totalDraws: 0,
					distribution: {},
				},
				records: [],
			};
		}

		// Calculate digit analysis
		const digitSums = {
			digit_0_count: 0,
			digit_1_count: 0,
			digit_2_count: 0,
			digit_3_count: 0,
			digit_4_count: 0,
			digit_5_count: 0,
			digit_6_count: 0,
			digit_7_count: 0,
			digit_8_count: 0,
			digit_9_count: 0,
		};
		const digitCounts = {
			digit0: 0,
			digit1: 0,
			digit2: 0,
			digit3: 0,
			digit4: 0,
			digit5: 0,
			digit6: 0,
			digit7: 0,
			digit8: 0,
			digit9: 0,
		};
		const distribution: Record<string, number> = {};

		records.forEach((record) => {
			Object.keys(digitSums).forEach((key) => {
				const digitKey = key as keyof typeof digitSums;
				const count = record[digitKey] || 0;
				digitSums[digitKey] += count;

				// Map to digitCounts with digit0, digit1 format
				const stringKey = key.replace("digit_", "").replace("_count", "");
				const countKey = `digit${stringKey}` as keyof typeof digitCounts;
				digitCounts[countKey] += count;
			});

			// Create pattern for this record using the DB field names
			const pattern = `${record.digit_0_count || 0}-${record.digit_1_count || 0}-${record.digit_2_count || 0}-${record.digit_3_count || 0}-${record.digit_4_count || 0}-${record.digit_5_count || 0}-${record.digit_6_count || 0}-${record.digit_7_count || 0}-${record.digit_8_count || 0}-${record.digit_9_count || 0}`;
			distribution[pattern] = (distribution[pattern] || 0) + 1;
		});

		const digitAverages = Object.fromEntries(
			Object.entries(digitSums).map(([digit, sum]) => [
				`digit${digit.replace("digit_", "").replace("_count", "")}`,
				(sum / records.length).toFixed(2),
			]),
		);

		// Find most frequent digit
		const mostFrequentDigitEntry = Object.entries(digitCounts).reduce(
			(max, [digit, count]) => (count > max[1] ? [digit, count] : max),
			["digit0", 0],
		);

		return {
			validRounds: true,
			selectedRounds: rounds,
			totalRounds,
			summary: {
				digitAverages,
				digitCounts,
				mostFrequentDigit: [
					Number.parseInt(mostFrequentDigitEntry[0].replace("digit", "")),
					mostFrequentDigitEntry[1],
				],
				totalDraws: records.length,
				distribution,
			},
			records,
		};
	} catch (error) {
		console.error("Failed to fetch recent unit-digit analysis:", error);
		const latestRoundInfo = await getLatestRoundInfo();
		return {
			validRounds: false,
			selectedRounds: rounds,
			totalRounds: latestRoundInfo?.round || 0,
			summary: {
				digitAverages: {
					digit0: "0.00",
					digit1: "0.00",
					digit2: "0.00",
					digit3: "0.00",
					digit4: "0.00",
					digit5: "0.00",
					digit6: "0.00",
					digit7: "0.00",
					digit8: "0.00",
					digit9: "0.00",
				},
				digitCounts: {
					digit0: 0,
					digit1: 0,
					digit2: 0,
					digit3: 0,
					digit4: 0,
					digit5: 0,
					digit6: 0,
					digit7: 0,
					digit8: 0,
					digit9: 0,
				},
				mostFrequentDigit: [0, 0],
				totalDraws: 0,
				distribution: {},
			},
			records: [],
		};
	}
}

// High-Low 분석을 위한 특화 함수
export async function getRecentHighLowAnalysis(rounds: number) {
	try {
		const baseResult = await getRecentAnalysis("high-low", rounds);

		if (!baseResult.validRounds || baseResult.analysisData.length === 0) {
			return {
				...baseResult,
				summary: {
					lowAverage: 0,
					highAverage: 0,
					lowCount: 0,
					highCount: 0,
					totalDraws: 0,
					distribution: {},
				},
				records: [],
			};
		}

		const records = baseResult.analysisData;
		let lowSum = 0,
			highSum = 0,
			lowCount = 0,
			highCount = 0;
		const distribution: Record<string, number> = {};

		records.forEach((record) => {
			lowSum += record.low_count || 0;
			highSum += record.high_count || 0;
			lowCount += record.low_count || 0;
			highCount += record.high_count || 0;

			const pattern = `${record.low_count || 0}:${record.high_count || 0}`;
			distribution[pattern] = (distribution[pattern] || 0) + 1;
		});

		return {
			...baseResult,
			summary: {
				lowAverage: (lowSum / records.length).toFixed(1),
				highAverage: (highSum / records.length).toFixed(1),
				lowCount,
				highCount,
				totalDraws: records.length,
				distribution,
			},
			records,
		};
	} catch (error) {
		console.error("Failed to fetch recent high-low analysis:", error);
		const latestRoundInfo = await getLatestRoundInfo();
		return {
			analysisData: [],
			selectedRounds: rounds,
			totalRounds: latestRoundInfo?.round || 0,
			validRounds: false,
			summary: {
				lowAverage: 0,
				highAverage: 0,
				lowCount: 0,
				highCount: 0,
				totalDraws: 0,
				distribution: {},
			},
			records: [],
		};
	}
}

// Sections 분석을 위한 특화 함수
export async function getRecentSectionsAnalysis(rounds: number) {
	try {
		const baseResult = await getRecentAnalysis("sections", rounds);

		if (!baseResult.validRounds || baseResult.analysisData.length === 0) {
			return {
				...baseResult,
				summary: {
					sectionAverages: {
						section1: 0,
						section2: 0,
						section3: 0,
						section4: 0,
						section5: 0,
					},
					sectionCounts: {
						section1: 0,
						section2: 0,
						section3: 0,
						section4: 0,
						section5: 0,
					},
					mostFrequentSection: [1, 0],
					totalDraws: 0,
					distribution: {},
				},
				records: [],
			};
		}

		const records = baseResult.analysisData;
		const sectionSums = {
			section1: 0,
			section2: 0,
			section3: 0,
			section4: 0,
			section5: 0,
		};
		const sectionCounts = {
			section1: 0,
			section2: 0,
			section3: 0,
			section4: 0,
			section5: 0,
		};
		const distribution: Record<string, number> = {};

		for (const record of records) {
			const recordAny = record as any;
			sectionSums.section1 += recordAny.section_1_10 || 0;
			sectionSums.section2 += recordAny.section_11_20 || 0;
			sectionSums.section3 += recordAny.section_21_30 || 0;
			sectionSums.section4 += recordAny.section_31_40 || 0;
			sectionSums.section5 += recordAny.section_41_45 || 0;
			sectionCounts.section1 += recordAny.section_1_10 || 0;
			sectionCounts.section2 += recordAny.section_11_20 || 0;
			sectionCounts.section3 += recordAny.section_21_30 || 0;
			sectionCounts.section4 += recordAny.section_31_40 || 0;
			sectionCounts.section5 += recordAny.section_41_45 || 0;

			// Create pattern for this record
			const pattern = `${recordAny.section_1_10 || 0}-${recordAny.section_11_20 || 0}-${recordAny.section_21_30 || 0}-${recordAny.section_31_40 || 0}-${recordAny.section_41_45 || 0}`;
			distribution[pattern] = (distribution[pattern] || 0) + 1;
		}

		const sectionAverages = Object.fromEntries(
			Object.entries(sectionSums).map(([section, sum]) => [
				section,
				(sum / records.length).toFixed(2),
			]),
		);

		// Find most frequent section
		const mostFrequentSectionEntry = Object.entries(sectionCounts).reduce(
			(max, [section, count]) => (count > max[1] ? [section, count] : max),
			["section1", 0],
		);

		return {
			...baseResult,
			summary: {
				sectionAverages,
				sectionCounts,
				mostFrequentSection: [
					Number.parseInt(mostFrequentSectionEntry[0].replace("section", "")),
					mostFrequentSectionEntry[1],
				],
				totalDraws: records.length,
				distribution,
			},
			records,
		};
	} catch (error) {
		console.error("Failed to fetch recent sections analysis:", error);
		const latestRoundInfo = await getLatestRoundInfo();
		return {
			analysisData: [],
			selectedRounds: rounds,
			totalRounds: latestRoundInfo?.round || 0,
			validRounds: false,
			summary: {
				sectionAverages: {
					section1: 0,
					section2: 0,
					section3: 0,
					section4: 0,
					section5: 0,
				},
				sectionCounts: {
					section1: 0,
					section2: 0,
					section3: 0,
					section4: 0,
					section5: 0,
				},
				mostFrequentSection: [1, 0],
				distribution: {},
				totalDraws: 0,
			},
			records: [],
		};
	}
}

// Repeat 분석을 위한 특화 함수
export async function getRecentRepeatAnalysis(rounds: number) {
	try {
		const baseResult = await getRecentAnalysis("repeat", rounds);

		if (!baseResult.validRounds || baseResult.analysisData.length === 0) {
			return {
				...baseResult,
				summary: {
					avgRepeatCount: 0,
					maxRepeatCount: 0,
					minRepeatCount: 0,
					totalDraws: 0,
					distribution: {},
				},
				records: [],
			};
		}

		const records = baseResult.analysisData;
		const repeatCounts = records.map((record) => record.repeat_count || 0);

		const avgRepeatCount =
			repeatCounts.reduce((sum, val) => sum + val, 0) / repeatCounts.length;
		const maxRepeatCount = Math.max(...repeatCounts);
		const minRepeatCount = Math.min(...repeatCounts);

		// 반복 번호 개수 분포 계산
		const distribution: Record<string, number> = {};
		repeatCounts.forEach((count) => {
			const countStr = count.toString();
			distribution[countStr] = (distribution[countStr] || 0) + 1;
		});

		// 중복 없음과 높은 중복 비율 계산
		const zeroRepeatCount = distribution["0"] || 0;
		const highRepeatCount = Object.entries(distribution)
			.filter(([count]) => Number(count) >= 3)
			.reduce((sum, [, value]) => sum + value, 0);

		const zeroRepeatRate = ((zeroRepeatCount / records.length) * 100).toFixed(
			1,
		);
		const highRepeatRate = ((highRepeatCount / records.length) * 100).toFixed(
			1,
		);

		return {
			...baseResult,
			summary: {
				avgRepeatCount: Number.parseFloat(avgRepeatCount.toFixed(2)),
				averageRepeatCount: Number.parseFloat(avgRepeatCount.toFixed(2)), // 별칭 추가
				maxRepeatCount,
				minRepeatCount,
				totalDraws: records.length,
				distribution,
				repeatCounts: distribution, // 별칭 추가
				zeroRepeatRate,
				highRepeatRate,
				zeroRepeatCount,
			},
			records,
		};
	} catch (error) {
		console.error("Failed to fetch recent repeat analysis:", error);
		const latestRoundInfo = await getLatestRoundInfo();
		return {
			analysisData: [],
			selectedRounds: rounds,
			totalRounds: latestRoundInfo?.round || 0,
			validRounds: false,
			summary: {
				avgRepeatCount: 0,
				maxRepeatCount: 0,
				minRepeatCount: 0,
				totalDraws: 0,
				distribution: {},
			},
			records: [],
		};
	}
}

// Odd-Even recent 분석 함수
export async function getRecentOddEvenAnalysis(rounds: number) {
	try {
		const baseResult = await getRecentAnalysis("odd-even", rounds);

		if (!baseResult.validRounds || baseResult.analysisData.length === 0) {
			return {
				...baseResult,
				oddEvenDistribution: {},
				sumDistribution: {},
				averageOddCount: "0.0",
				balancedRate: "0.0",
				extremeRate: "0.0",
			};
		}

		const records = baseResult.analysisData;
		const oddCounts: Record<string, number> = {};
		const sumRanges: Record<string, number> = {};
		let totalOddCount = 0;
		let balancedCount = 0;
		let extremeCount = 0;

		records.forEach((record) => {
			const oddCount = record.odd_count || 0;
			const sum = record.numbers_sum || 0;

			// Odd count distribution
			const oddKey = oddCount.toString();
			oddCounts[oddKey] = (oddCounts[oddKey] || 0) + 1;
			totalOddCount += oddCount;

			// Sum range distribution
			let sumRange = "";
			if (sum <= 80) sumRange = "60-80";
			else if (sum <= 100) sumRange = "81-100";
			else if (sum <= 120) sumRange = "101-120";
			else if (sum <= 140) sumRange = "121-140";
			else if (sum <= 160) sumRange = "141-160";
			else if (sum <= 180) sumRange = "161-180";
			else if (sum <= 200) sumRange = "181-200";
			else if (sum <= 220) sumRange = "201-220";
			else sumRange = "221-240";

			sumRanges[sumRange] = (sumRanges[sumRange] || 0) + 1;

			// Balance analysis
			if (oddCount >= 2 && oddCount <= 4) balancedCount++;
			if (oddCount === 0 || oddCount === 6) extremeCount++;
		});

		const averageOddCount = (totalOddCount / records.length).toFixed(1);
		const balancedRate = ((balancedCount / records.length) * 100).toFixed(1);
		const extremeRate = ((extremeCount / records.length) * 100).toFixed(1);

		return {
			...baseResult,
			oddEvenDistribution: oddCounts,
			sumDistribution: sumRanges,
			averageOddCount,
			balancedRate,
			extremeRate,
		};
	} catch (error) {
		console.error("Failed to fetch recent odd-even analysis:", error);
		const latestRoundInfo = await getLatestRoundInfo();
		return {
			analysisData: [],
			selectedRounds: rounds,
			totalRounds: latestRoundInfo?.round || 0,
			validRounds: false,
			oddEvenDistribution: {},
			sumDistribution: {},
			averageOddCount: "0.0",
			balancedRate: "0.0",
			extremeRate: "0.0",
		};
	}
}

// Helper function to determine section for a number
function getNumberSection(num: number): number {
	if (num >= 1 && num <= 10) return 1; // section_1_10
	if (num >= 11 && num <= 20) return 2; // section_11_20
	if (num >= 21 && num <= 30) return 3; // section_21_30
	if (num >= 31 && num <= 40) return 4; // section_31_40
	if (num >= 41 && num <= 45) return 5; // section_41_45
	return 0; // Invalid number
}

// 기존 구간 통계 테이블에서 데이터를 가져오는 함수
async function getSectionsAnalysisFromTable(): Promise<{
	sectionStats: SectionStat[];
	totalRecords: number;
	sectionDistribution: Record<string, { average: number; total: number }>;
	recentStats: SectionStat[];
	totalRounds: number;
}> {
	const [latestRoundInfo, sectionStats] = (await Promise.all([
		getLatestRoundInfo(),
		getStatsForAnalysisType("sections"),
	])) as [LatestRoundInfo | null, SectionStat[]];

	const totalRecords = sectionStats.length;

	if (totalRecords === 0) {
		return {
			sectionStats: [],
			totalRecords: 0,
			sectionDistribution: {
				section_1_10: { average: 0, total: 0 },
				section_11_20: { average: 0, total: 0 },
				section_21_30: { average: 0, total: 0 },
				section_31_40: { average: 0, total: 0 },
				section_41_45: { average: 0, total: 0 },
			},
			recentStats: [],
			totalRounds: latestRoundInfo?.round || 0,
		};
	}

	// Calculate section distribution from existing stats
	const sectionSums = {
		section_1_10: 0,
		section_11_20: 0,
		section_21_30: 0,
		section_31_40: 0,
		section_41_45: 0,
	};

	for (const record of sectionStats) {
		sectionSums.section_1_10 += record.section_1_10 || 0;
		sectionSums.section_11_20 += record.section_11_20 || 0;
		sectionSums.section_21_30 += record.section_21_30 || 0;
		sectionSums.section_31_40 += record.section_31_40 || 0;
		sectionSums.section_41_45 += record.section_41_45 || 0;
	}

	const sectionDistribution = Object.fromEntries(
		Object.entries(sectionSums).map(([section, sum]) => [
			section,
			{
				average: Number.parseFloat((sum / totalRecords).toFixed(2)),
				total: sum,
			},
		]),
	);

	return {
		sectionStats,
		totalRecords,
		sectionDistribution,
		recentStats: sectionStats.slice(0, 10),
		totalRounds: latestRoundInfo?.round || 0,
	};
}

// Sections 메인 분석 함수
export async function getSectionsAnalysis(): Promise<{
	sectionStats: SectionStat[];
	totalRecords: number;
	sectionDistribution: Record<string, { average: number; total: number }>;
	recentStats: SectionStat[];
	totalRounds: number;
}> {
	try {
		const latestRoundInfo = await getLatestRoundInfo();

		// 먼저 기존 구간 통계 테이블을 확인해보자
		try {
			const sectionStatsResponse = await client
				.records("lotto_draw_section_stats")
				.list({
					order: ["-round"],
					pagination: { limit: 10 },
				});

			if (sectionStatsResponse.records.length > 0) {
				return await getSectionsAnalysisFromTable();
			}
		} catch (sectionError) {
			// Section stats table not found, calculate from raw data
		}

		// Get all draw results and calculate section stats from the actual numbers
		const response = await client.records("lotto_draw_results").list({
			order: ["-round"],
			pagination: { limit: 1000 },
		});

		const drawResults = response.records;
		const totalRecords = drawResults.length;

		if (totalRecords === 0) {
			return {
				sectionStats: [],
				totalRecords: 0,
				sectionDistribution: {
					section_1_10: { average: 0, total: 0 },
					section_11_20: { average: 0, total: 0 },
					section_21_30: { average: 0, total: 0 },
					section_31_40: { average: 0, total: 0 },
					section_41_45: { average: 0, total: 0 },
				},
				recentStats: [],
				totalRounds: latestRoundInfo?.round || 0,
			};
		}

		// Calculate section distribution
		const sectionSums = {
			section_1_10: 0,
			section_11_20: 0,
			section_21_30: 0,
			section_31_40: 0,
			section_41_45: 0,
		};

		const sectionStats: SectionStat[] = [];

		for (const record of drawResults) {
			const numbers = [
				record.number1,
				record.number2,
				record.number3,
				record.number4,
				record.number5,
				record.number6,
			].filter((n: any) => n && Number(n) > 0);

			const sectionCounts = {
				section1: 0,
				section2: 0,
				section3: 0,
				section4: 0,
				section5: 0,
			};

			for (const num of numbers) {
				const section = getNumberSection(Number(num));
				if (section >= 1 && section <= 5) {
					sectionCounts[`section${section}` as keyof typeof sectionCounts]++;
				}
			}

			// Add to running totals
			sectionSums.section_1_10 += sectionCounts.section1;
			sectionSums.section_11_20 += sectionCounts.section2;
			sectionSums.section_21_30 += sectionCounts.section3;
			sectionSums.section_31_40 += sectionCounts.section4;
			sectionSums.section_41_45 += sectionCounts.section5;

			// Create section stat record
			sectionStats.push({
				round: Number(record.round),
				section_1_10: sectionCounts.section1,
				section_11_20: sectionCounts.section2,
				section_21_30: sectionCounts.section3,
				section_31_40: sectionCounts.section4,
				section_41_45: sectionCounts.section5,
			});
		}

		const sectionDistribution = Object.fromEntries(
			Object.entries(sectionSums).map(([section, sum]) => [
				section,
				{
					average: Number.parseFloat((sum / totalRecords).toFixed(2)),
					total: sum,
				},
			]),
		);

		return {
			sectionStats,
			totalRecords,
			sectionDistribution,
			recentStats: sectionStats.slice(0, 10),
			totalRounds: latestRoundInfo?.round || 0,
		};
	} catch (error) {
		console.error("Failed to fetch sections analysis:", error);
		const latestRoundInfo = await getLatestRoundInfo();
		return {
			sectionStats: [],
			totalRecords: 0,
			sectionDistribution: {
				section_1_10: { average: 0, total: 0 },
				section_11_20: { average: 0, total: 0 },
				section_21_30: { average: 0, total: 0 },
				section_31_40: { average: 0, total: 0 },
				section_41_45: { average: 0, total: 0 },
			},
			recentStats: [],
			totalRounds: latestRoundInfo?.round || 0,
		};
	}
}

// AC 메인 분석 함수
export async function getACAnalysis(): Promise<{
	acStats: ACStat[];
	totalRecords: number;
	averageAcValue: number;
	mostFrequentAc: [number, number];
	minAcValue: number;
	maxAcValue: number;
	acDistribution: Record<string, number>;
	acRangeDistribution: Record<string, number>;
	lowComplexityRate: string;
	highComplexityRate: string;
	recentStats: ACStat[];
	totalRounds: number;
}> {
	try {
		const [latestRoundInfo, acStats] = (await Promise.all([
			getLatestRoundInfo(),
			getStatsForAnalysisType("ac"),
		])) as [LatestRoundInfo | null, ACStat[]];

		const totalRecords = acStats.length;

		if (totalRecords === 0) {
			return {
				acStats: [],
				totalRecords: 0,
				averageAcValue: 0,
				mostFrequentAc: [0, 0],
				minAcValue: 0,
				maxAcValue: 0,
				acDistribution: {},
				acRangeDistribution: {},
				lowComplexityRate: "0.0",
				highComplexityRate: "0.0",
				recentStats: [],
				totalRounds: latestRoundInfo?.round || 0,
			};
		}

		// Calculate AC analysis
		const acValues = acStats.map((record) => record.ac_value || 0);
		const averageAcValue =
			acValues.reduce((sum, val) => sum + val, 0) / acValues.length;
		const minAcValue = Math.min(...acValues);
		const maxAcValue = Math.max(...acValues);

		// AC value frequency distribution
		const acDistribution: Record<string, number> = {};
		acValues.forEach((ac) => {
			const key = ac.toString();
			acDistribution[key] = (acDistribution[key] || 0) + 1;
		});

		// Find most frequent AC value
		const mostFrequentAc = Object.entries(acDistribution).reduce(
			(max, [ac, count]) =>
				count > max[1] ? [Number.parseInt(ac), count] : max,
			[0, 0],
		);

		// AC range distribution
		const acRangeDistribution: Record<string, number> = {};
		acValues.forEach((ac) => {
			const range = getACRange(ac);
			acRangeDistribution[range] = (acRangeDistribution[range] || 0) + 1;
		});

		// Complexity rates
		const lowComplexityCount = acValues.filter((ac) => ac <= 10).length;
		const highComplexityCount = acValues.filter((ac) => ac >= 20).length;
		const lowComplexityRate = (
			(lowComplexityCount / totalRecords) *
			100
		).toFixed(1);
		const highComplexityRate = (
			(highComplexityCount / totalRecords) *
			100
		).toFixed(1);

		return {
			acStats,
			totalRecords,
			averageAcValue: Number.parseFloat(averageAcValue.toFixed(2)),
			mostFrequentAc: mostFrequentAc as [number, number],
			minAcValue,
			maxAcValue,
			acDistribution,
			acRangeDistribution,
			lowComplexityRate,
			highComplexityRate,
			recentStats: acStats.slice(0, 10),
			totalRounds: latestRoundInfo?.round || 0,
		};
	} catch (error) {
		console.error("Failed to fetch AC analysis:", error);
		const latestRoundInfo = await getLatestRoundInfo();
		return {
			acStats: [],
			totalRecords: 0,
			averageAcValue: 0,
			mostFrequentAc: [0, 0],
			minAcValue: 0,
			maxAcValue: 0,
			acDistribution: {},
			acRangeDistribution: {},
			lowComplexityRate: "0.0",
			highComplexityRate: "0.0",
			recentStats: [],
			totalRounds: latestRoundInfo?.round || 0,
		};
	}
}

// Unit-Digit 메인 분석 함수
export async function getUnitDigitAnalysis(): Promise<{
	unitDigitStats: UnitDigitStat[];
	totalRecords: number;
	digitAverages: Record<string, string>;
	digitTotals: Record<string, number>;
	digitCountDistribution: Record<string, Record<string, number>>;
	mostFrequentDigit: [number, string];
	leastFrequentDigit: [number, string];
	recentStats: UnitDigitStat[];
	totalRounds: number;
}> {
	try {
		// Get all unit-digit stats with batch processing
		let allUnitDigitStats: UnitDigitStat[] = [];

		const batchSize = 1024;
		let batchOffset = 0;

		while (true) {
			const response = await client
				.records("lotto_draw_unit_digit_stats")
				.list({
					order: ["-round"],
					pagination: { limit: batchSize, offset: batchOffset },
				});

			const batchRecords = response.records as UnitDigitStat[];

			if (batchRecords.length === 0) {
				break;
			}

			allUnitDigitStats = allUnitDigitStats.concat(batchRecords);
			batchOffset += batchSize;
		}

		const latestRoundInfo = await getLatestRoundInfo();
		const unitDigitStats = allUnitDigitStats;
		const totalRecords = unitDigitStats.length;

		if (totalRecords === 0) {
			return {
				unitDigitStats: [],
				totalRecords: 0,
				digitAverages: {},
				digitTotals: {},
				digitCountDistribution: {},
				mostFrequentDigit: [0, "0"],
				leastFrequentDigit: [0, "0"],
				recentStats: [],
				totalRounds: latestRoundInfo?.round || 0,
			};
		}

		// Calculate digit analysis
		const digitSums = {
			digit_0_count: 0,
			digit_1_count: 0,
			digit_2_count: 0,
			digit_3_count: 0,
			digit_4_count: 0,
			digit_5_count: 0,
			digit_6_count: 0,
			digit_7_count: 0,
			digit_8_count: 0,
			digit_9_count: 0,
		};
		const digitTotals = {
			"0": 0,
			"1": 0,
			"2": 0,
			"3": 0,
			"4": 0,
			"5": 0,
			"6": 0,
			"7": 0,
			"8": 0,
			"9": 0,
		};
		const digitCountDistribution: Record<string, Record<string, number>> = {
			"0": {},
			"1": {},
			"2": {},
			"3": {},
			"4": {},
			"5": {},
			"6": {},
			"7": {},
			"8": {},
			"9": {},
		};

		unitDigitStats.forEach((record) => {
			Object.keys(digitSums).forEach((key) => {
				const digitKey = key as keyof typeof digitSums;
				const count = record[digitKey] || 0;
				digitSums[digitKey] += count;

				// Map to string key for digitTotals and digitCountDistribution
				const stringKey = key.replace("digit_", "").replace("_count", "");
				digitTotals[stringKey] += count;

				// Count distribution
				const countStr = count.toString();
				if (!digitCountDistribution[stringKey][countStr]) {
					digitCountDistribution[stringKey][countStr] = 0;
				}
				digitCountDistribution[stringKey][countStr]++;
			});
		});

		const digitAverages = Object.fromEntries(
			Object.entries(digitSums).map(([digit, sum]) => [
				digit.replace("digit_", "").replace("_count", ""),
				(sum / totalRecords).toFixed(2),
			]),
		);

		// Find most/least frequent digits
		const digitTotalEntries = Object.entries(digitTotals).map(
			([digit, total]) =>
				[Number.parseInt(digit), total.toString()] as [number, string],
		);

		const mostFrequentDigit = digitTotalEntries.reduce(
			(max, [digit, total]) =>
				Number.parseInt(total) > Number.parseInt(max[1]) ? [digit, total] : max,
			[0, "0"],
		);

		const leastFrequentDigit = digitTotalEntries.reduce(
			(min, [digit, total]) =>
				Number.parseInt(total) < Number.parseInt(min[1]) ? [digit, total] : min,
			[0, digitTotalEntries[0]?.[1] || "0"],
		);

		return {
			unitDigitStats,
			totalRecords,
			digitAverages,
			digitTotals,
			digitCountDistribution,
			mostFrequentDigit,
			leastFrequentDigit,
			recentStats: unitDigitStats.slice(0, 10),
			totalRounds: latestRoundInfo?.round || 0,
		};
	} catch (error) {
		console.error("Failed to fetch unit-digit analysis:", error);
		const latestRoundInfo = await getLatestRoundInfo();
		return {
			unitDigitStats: [],
			totalRecords: 0,
			digitAverages: {},
			digitTotals: {},
			digitCountDistribution: {},
			mostFrequentDigit: [0, "0"],
			leastFrequentDigit: [0, "0"],
			recentStats: [],
			totalRounds: latestRoundInfo?.round || 0,
		};
	}
}

// High-Low 메인 분석 함수
export async function getHighLowAnalysis(): Promise<{
	highLowStats: HighLowStat[];
	totalRecords: number;
	averageLowCount: number;
	averageHighCount: number;
	highLowDistribution: Record<string, number>;
	patternStats: Record<string, number>;
	mostFrequentPattern: [string, number];
	recentStats: HighLowStat[];
	totalRounds: number;
}> {
	try {
		const [latestRoundInfo, highLowStats] = (await Promise.all([
			getLatestRoundInfo(),
			getStatsForAnalysisType("high-low"),
		])) as [LatestRoundInfo | null, HighLowStat[]];

		const totalRecords = highLowStats.length;

		if (totalRecords === 0) {
			return {
				highLowStats: [],
				totalRecords: 0,
				averageLowCount: 0,
				averageHighCount: 0,
				highLowDistribution: {},
				patternStats: {},
				mostFrequentPattern: ["", 0],
				recentStats: [],
				totalRounds: latestRoundInfo?.round || 0,
			};
		}

		// Calculate high-low analysis
		let lowSum = 0,
			highSum = 0;
		const distribution: Record<string, number> = {
			"0": 0,
			"1": 0,
			"2": 0,
			"3": 0,
			"4": 0,
			"5": 0,
			"6": 0,
		};
		const patternStats: Record<string, number> = {
			balanced: 0,
			extreme: 0,
		};

		highLowStats.forEach((record) => {
			const lowCount = record.low_count || 0;
			const highCount = record.high_count || 0;

			lowSum += lowCount;
			highSum += highCount;

			// Distribution by high count (0-6)
			if (highCount >= 0 && highCount <= 6) {
				distribution[highCount.toString()]++;
			}

			// Pattern analysis for balance
			if (highCount === 3) {
				patternStats.balanced++;
			} else if (highCount === 0 || highCount === 6) {
				patternStats.extreme++;
			}
		});

		const averageLowCount = Number.parseFloat(
			(lowSum / totalRecords).toFixed(2),
		);
		const averageHighCount = Number.parseFloat(
			(highSum / totalRecords).toFixed(2),
		);

		// Find most frequent high count
		const mostFrequentPattern = Object.entries(distribution).reduce(
			(max, [highCount, count]) => (count > max[1] ? [highCount, count] : max),
			["3", 0],
		);

		return {
			highLowStats,
			totalRecords,
			averageLowCount,
			averageHighCount,
			highLowDistribution: distribution,
			patternStats,
			mostFrequentPattern: mostFrequentPattern as [string, number],
			recentStats: highLowStats.slice(0, 10),
			totalRounds: latestRoundInfo?.round || 0,
		};
	} catch (error) {
		console.error("Failed to fetch high-low analysis:", error);
		const latestRoundInfo = await getLatestRoundInfo();
		return {
			highLowStats: [],
			totalRecords: 0,
			averageLowCount: 0,
			averageHighCount: 0,
			highLowDistribution: {},
			patternStats: {},
			mostFrequentPattern: ["", 0],
			recentStats: [],
			totalRounds: latestRoundInfo?.round || 0,
		};
	}
}

// Repeat 메인 분석 함수
export async function getRepeatAnalysis(): Promise<{
	repeatStats: RepeatStat[];
	totalRecords: number;
	averageRepeatCount: number;
	maxRepeatCount: number;
	repeatCountDistribution: Record<string, number>;
	zeroRepeatRate: string;
	zeroRepeatCount: number;
	highRepeatRate: string;
	recentStats: RepeatStat[];
	totalRounds: number;
}> {
	try {
		const [latestRoundInfo, repeatStats] = (await Promise.all([
			getLatestRoundInfo(),
			getStatsForAnalysisType("repeat"),
		])) as [LatestRoundInfo | null, RepeatStat[]];

		const totalRecords = repeatStats.length;

		if (totalRecords === 0) {
			return {
				repeatStats: [],
				totalRecords: 0,
				averageRepeatCount: 0,
				maxRepeatCount: 0,
				repeatCountDistribution: {},
				zeroRepeatRate: "0.0",
				zeroRepeatCount: 0,
				highRepeatRate: "0.0",
				recentStats: [],
				totalRounds: latestRoundInfo?.round || 0,
			};
		}

		// Calculate repeat analysis
		const repeatCounts = repeatStats.map((record) => record.repeat_count || 0);
		const totalRepeatSum = repeatCounts.reduce((sum, count) => sum + count, 0);
		const averageRepeatCount = Number.parseFloat(
			(totalRepeatSum / totalRecords).toFixed(2),
		);
		const maxRepeatCount = Math.max(...repeatCounts);

		// Count distribution
		const distribution: Record<string, number> = {};
		let zeroRepeatCount = 0;
		let highRepeatCount = 0; // 3개 이상

		repeatCounts.forEach((count) => {
			const key = count.toString();
			distribution[key] = (distribution[key] || 0) + 1;

			if (count === 0) zeroRepeatCount++;
			if (count >= 3) highRepeatCount++;
		});

		const zeroRepeatRate = ((zeroRepeatCount / totalRecords) * 100).toFixed(1);
		const highRepeatRate = ((highRepeatCount / totalRecords) * 100).toFixed(1);

		return {
			repeatStats,
			totalRecords,
			averageRepeatCount,
			maxRepeatCount,
			repeatCountDistribution: distribution,
			zeroRepeatRate,
			zeroRepeatCount,
			highRepeatRate,
			recentStats: repeatStats.slice(0, 10),
			totalRounds: latestRoundInfo?.round || 0,
		};
	} catch (error) {
		console.error("Failed to fetch repeat analysis:", error);
		const latestRoundInfo = await getLatestRoundInfo();
		return {
			repeatStats: [],
			totalRecords: 0,
			averageRepeatCount: 0,
			maxRepeatCount: 0,
			repeatCountDistribution: {},
			zeroRepeatRate: "0.0",
			zeroRepeatCount: 0,
			highRepeatRate: "0.0",
			recentStats: [],
			totalRounds: latestRoundInfo?.round || 0,
		};
	}
}

// AC값 범위 계산 헬퍼 함수
function getACRange(ac: number): string {
	if (ac <= 5) return "0-5";
	if (ac <= 10) return "6-10";
	if (ac <= 15) return "11-15";
	if (ac <= 20) return "16-20";
	if (ac <= 25) return "21-25";
	return "26+";
}

// Export the client for custom queries
export { client as statsClient };

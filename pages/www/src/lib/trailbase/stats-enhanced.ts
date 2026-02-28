// @ts-nocheck
/**
 * Enhanced TrailBase Stats API helpers with strict typing
 * Provides type-safe data fetching and error handling for statistics
 */

import { PUBLIC_TRAILBASE_URL } from "$env/static/public";
import type {
	ApiResponse,
	BallColor,
	LottoNumber,
	NumberSection,
	RoundNumber,
} from "$lib/types";
import { createLottoNumber, createRoundNumber } from "$lib/types";
import { withErrorHandling, withRetry } from "$lib/utils/error-handling";
import { initClient } from "trailbase";

// Initialize TrailBase client
const client = initClient(PUBLIC_TRAILBASE_URL || "http://localhost:4000");

// ============= Enhanced Type Definitions =============

/** Latest round information with strict typing */
export interface LatestRoundInfo {
	readonly round: RoundNumber;
	readonly drawDate: string; // ISO date string
}

/** Number statistics with enhanced typing */
export interface NumberStatistics {
	readonly number: LottoNumber;
	readonly drawCount: number;
	readonly bonusCount: number;
	readonly color: BallColor;
	readonly section: NumberSection;
	readonly averageFrequency: number;
	readonly deviation: number;
	readonly lastDrawRound: RoundNumber | null;
	readonly frequency: number; // Calculated percentage
}

/** Odd/Even statistics */
export interface OddEvenStatistics {
	readonly round: RoundNumber;
	readonly oddCount: number;
	readonly evenCount: number;
	readonly numbersSum: number;
	readonly ratio: string; // e.g., "3:3"
	readonly isBalanced: boolean;
}

/** Color distribution statistics */
export interface ColorStatistics {
	readonly round: RoundNumber;
	readonly distribution: Record<BallColor, number>;
	readonly mostFrequentColor: BallColor;
	readonly complexity: "low" | "medium" | "high";
}

/** Number pair statistics */
export interface PairStatistics {
	readonly numberA: LottoNumber;
	readonly numberB: LottoNumber;
	readonly pairCount: number;
	readonly frequency: number;
	readonly lastAppearance: RoundNumber | null;
}

/** Section distribution statistics */
export interface SectionStatistics {
	readonly round: RoundNumber;
	readonly distribution: Record<`section_${NumberSection}`, number>;
	readonly mostActiveSection: NumberSection;
	readonly balance: number; // 0-1 scale, 1 being perfectly balanced
}

/** AC (Adjacent Coefficient) statistics */
export interface ACStatistics {
	readonly round: RoundNumber;
	readonly acValue: number;
	readonly complexity: "very_low" | "low" | "medium" | "high" | "very_high";
	readonly isOptimal: boolean; // AC 12-18 range
}

/** Unit digit statistics */
export interface UnitDigitStatistics {
	readonly round: RoundNumber;
	readonly distribution: Record<string, number>; // "0" to "9"
	readonly mostFrequentDigit: number;
	readonly leastFrequentDigit: number;
	readonly balance: number;
}

/** High/Low number statistics */
export interface HighLowStatistics {
	readonly round: RoundNumber;
	readonly lowCount: number; // 1-22
	readonly highCount: number; // 23-45
	readonly ratio: string;
	readonly isBalanced: boolean;
}

/** Repeat number statistics */
export interface RepeatStatistics {
	readonly round: RoundNumber;
	readonly repeatCount: number;
	readonly repeatNumbers: readonly LottoNumber[];
	readonly noRepeatStreak: number;
}

// ============= API Response Wrappers =============
// Remove unused safeApiCall function - using withErrorHandling pattern instead

// ============= Core API Functions =============

/** Get latest round information with validation */
export const getLatestRoundInfo = withErrorHandling(
	async (): Promise<LatestRoundInfo | null> => {
		const response = await client.records("lotto_draw_results").list({
			order: ["-round"],
			pagination: { limit: 1 },
		});

		if (response.records.length === 0) {
			return null;
		}

		const latest = response.records[0] as { round: number; draw_date: string };
		return {
			round: createRoundNumber(latest.round),
			drawDate: latest.draw_date,
		};
	},
	"getLatestRoundInfo",
);

/** Get number statistics with enhanced typing */
export const getNumberStatistics = withErrorHandling(
	async (
		options: {
			order?: "asc" | "desc";
			limit?: number;
		} = {},
	): Promise<readonly NumberStatistics[]> => {
		const { order = "desc", limit } = options;
		const sortOrder = order === "desc" ? ["-draw_count"] : ["draw_count"];

		const queryOptions: { order: string[]; pagination?: { limit: number } } = {
			order: sortOrder,
		};

		if (limit) {
			queryOptions.pagination = { limit };
		}

		const response = await client
			.records("lotto_number_stats")
			.list(queryOptions);

		return response.records.map(
			(record: Record<string, unknown>): NumberStatistics => {
				const number = createLottoNumber(Number(record.number));
				const drawCount = Number(record.draw_count) || 0;
				const bonusCount = Number(record.bonus_count) || 0;
				const totalCount = drawCount + bonusCount;

				return {
					number,
					drawCount,
					bonusCount,
					color: getBallColor(number),
					section: getNumberSection(number),
					averageFrequency: Number.parseFloat(
						String(record.average_frequency || "0"),
					),
					deviation: Number.parseFloat(String(record.deviation || "0")),
					lastDrawRound: record.last_draw_round
						? createRoundNumber(Number(record.last_draw_round))
						: null,
					frequency:
						totalCount > 0 ? (totalCount / (drawCount + bonusCount)) * 100 : 0,
				};
			},
		);
	},
	"getNumberStatistics",
);

/** Get odd/even statistics with analysis */
export const getOddEvenAnalysis = withErrorHandling(
	async (limit = 10): Promise<readonly OddEvenStatistics[]> => {
		const response = await client.records("lotto_draw_odd_even_stats").list({
			order: ["-round"],
			pagination: { limit },
		});

		return response.records.map(
			(record: Record<string, unknown>): OddEvenStatistics => {
				const oddCount = Number(record.odd_count) || 0;
				const evenCount = Number(record.even_count) || 0;

				return {
					round: createRoundNumber(Number(record.round)),
					oddCount,
					evenCount,
					numbersSum: Number(record.numbers_sum) || 0,
					ratio: `${oddCount}:${evenCount}`,
					isBalanced: Math.abs(oddCount - evenCount) <= 1,
				};
			},
		);
	},
	"getOddEvenAnalysis",
);

/** Get color statistics with complexity analysis */
export const getColorAnalysis = withErrorHandling(
	async (limit = 10): Promise<readonly ColorStatistics[]> => {
		const response = await client.records("lotto_draw_color_stats").list({
			order: ["-round"],
			pagination: { limit },
		});

		return response.records.map(
			(record: Record<string, unknown>): ColorStatistics => {
				const distribution: Record<BallColor, number> = {
					yellow: Number(record.yellow_count) || 0,
					blue: Number(record.blue_count) || 0,
					red: Number(record.red_count) || 0,
					grey: Number(record.grey_count) || 0,
					green: Number(record.green_count) || 0,
				};

				const counts = Object.values(distribution);
				const maxCount = Math.max(...counts);
				const complexity =
					maxCount <= 1 ? "low" : maxCount >= 4 ? "high" : "medium";

				const mostFrequentColor = Object.entries(distribution).reduce(
					(maxEntry, [color, count]) => {
						const [, maxCount] = maxEntry;
						return count > maxCount ? [color, count] : maxEntry;
					},
					["yellow", distribution.yellow],
				)[0] as BallColor;

				return {
					round: createRoundNumber(Number(record.round)),
					distribution,
					mostFrequentColor,
					complexity,
				};
			},
		);
	},
	"getColorAnalysis",
);

/** Get pair statistics */
export const getPairStatistics = withErrorHandling(
	async (limit = 20): Promise<readonly PairStatistics[]> => {
		const response = await client.records("lotto_number_pair_stats").list({
			order: ["-pair_count"],
			pagination: { limit },
		});

		// Get total number of draws for frequency calculation
		const latestRound = await getLatestRoundInfo();
		const totalDraws = latestRound?.round || 1;

		return response.records.map(
			(record: Record<string, unknown>): PairStatistics => ({
				numberA: createLottoNumber(Number(record.number_a)),
				numberB: createLottoNumber(Number(record.number_b)),
				pairCount: Number(record.pair_count) || 0,
				frequency: ((Number(record.pair_count) || 0) / totalDraws) * 100,
				lastAppearance: record.last_appearance
					? createRoundNumber(Number(record.last_appearance))
					: null,
			}),
		);
	},
	"getPairStatistics",
);

// ============= Analysis Functions =============

/** Analyze number frequency patterns */
export function analyzeNumberFrequency(stats: readonly NumberStatistics[]): {
	readonly hotNumbers: readonly NumberStatistics[];
	readonly coldNumbers: readonly NumberStatistics[];
	readonly averageFrequency: number;
	readonly standardDeviation: number;
} {
	if (stats.length === 0) {
		return {
			hotNumbers: [],
			coldNumbers: [],
			averageFrequency: 0,
			standardDeviation: 0,
		};
	}

	const frequencies = stats.map((s) => s.frequency);
	const averageFrequency =
		frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;

	const variance =
		frequencies.reduce((sum, freq) => sum + (freq - averageFrequency) ** 2, 0) /
		frequencies.length;
	const standardDeviation = Math.sqrt(variance);

	const threshold = averageFrequency * 0.2; // 20% threshold

	return {
		hotNumbers: stats.filter((s) => s.frequency > averageFrequency + threshold),
		coldNumbers: stats.filter(
			(s) => s.frequency < averageFrequency - threshold,
		),
		averageFrequency,
		standardDeviation,
	};
}

/** Analyze section balance */
export function analyzeSectionBalance(stats: readonly SectionStatistics[]): {
	readonly balanceScore: number;
	readonly trendDirection: "increasing" | "decreasing" | "stable";
	readonly mostActiveSection: NumberSection;
} {
	if (stats.length === 0) {
		return {
			balanceScore: 0,
			trendDirection: "stable",
			mostActiveSection: 1,
		};
	}

	// Calculate balance score (0-1, 1 being perfectly balanced)
	const latest = stats[0];
	if (!latest) {
		return {
			balanceScore: 0,
			trendDirection: "stable" as const,
			mostActiveSection: 1,
		};
	}

	const sectionCounts = Object.values(latest.distribution);
	const idealCount = 6 / 5; // 6 numbers divided by 5 sections
	const variance =
		sectionCounts.reduce((sum, count) => sum + (count - idealCount) ** 2, 0) /
		sectionCounts.length;
	const balanceScore = Math.max(0, 1 - variance / idealCount);

	// Determine trend
	let trendDirection: "increasing" | "decreasing" | "stable" = "stable";
	if (stats.length > 1 && stats[1]) {
		const currentBalance = latest.balance;
		const previousBalance = stats[1].balance;
		const difference = currentBalance - previousBalance;

		if (Math.abs(difference) > 0.1) {
			trendDirection = difference > 0 ? "increasing" : "decreasing";
		}
	}

	return {
		balanceScore,
		trendDirection,
		mostActiveSection: latest.mostActiveSection,
	};
}

// ============= Helper Functions =============

/** Get ball color based on number */
function getBallColor(number: LottoNumber): BallColor {
	if (number >= 1 && number <= 10) return "yellow";
	if (number >= 11 && number <= 20) return "blue";
	if (number >= 21 && number <= 30) return "red";
	if (number >= 31 && number <= 40) return "grey";
	return "green"; // 41-45
}

/** Get number section */
function getNumberSection(number: LottoNumber): NumberSection {
	if (number >= 1 && number <= 10) return 1;
	if (number >= 11 && number <= 20) return 2;
	if (number >= 21 && number <= 30) return 3;
	if (number >= 31 && number <= 40) return 4;
	return 5; // 41-45
}

/** Validate lotto numbers array */
export function validateLottoNumbers(
	numbers: readonly unknown[],
): numbers is readonly LottoNumber[] {
	return (
		numbers.length === 6 &&
		numbers.every(
			(num) =>
				typeof num === "number" &&
				Number.isInteger(num) &&
				num >= 1 &&
				num <= 45,
		)
	);
}

/** Create safe lotto number array */
export function createSafeLottoNumbers(
	numbers: readonly unknown[],
): readonly LottoNumber[] | null {
	if (!validateLottoNumbers(numbers)) {
		return null;
	}
	return numbers;
}

// ============= Batch Operations =============

/** Get comprehensive statistics for a round */
export const getComprehensiveRoundStats = withErrorHandling(
	async (
		_round: RoundNumber,
	): Promise<{
		readonly oddEven: OddEvenStatistics | null;
		readonly colors: ColorStatistics | null;
		readonly sections: SectionStatistics | null;
		readonly ac: ACStatistics | null;
		readonly highLow: HighLowStatistics | null;
		readonly repeat: RepeatStatistics | null;
	}> => {
		const [oddEvenStats, colorStats] = await Promise.all([
			getOddEvenAnalysis(1),
			getColorAnalysis(1),
		]);

		return {
			oddEven: oddEvenStats[0] || null,
			colors: colorStats[0] || null,
			sections: null, // TODO: Implement
			ac: null, // TODO: Implement
			highLow: null, // TODO: Implement
			repeat: null, // TODO: Implement
		};
	},
	"getComprehensiveRoundStats",
);

// Export the enhanced client for custom queries
export { client as enhancedStatsClient };

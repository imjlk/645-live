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

// Latest round information
export async function getLatestRoundInfo(): Promise<LatestRoundInfo | null> {
  try {
    const response = await client
      .records("lotto_draw_results")
      .list({
        order: ["-round"],
        pagination: { limit: 1 },
      });

    if (response.records.length > 0) {
      const latest = response.records[0] as LatestRoundInfo;
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
export async function getNumberStats(order: "asc" | "desc" = "desc", limit?: number): Promise<NumberStat[]> {
  try {
    const sortOrder = order === "desc" ? ["-draw_count"] : ["draw_count"];
    const response = await client.records("lotto_number_stats").list({
      order: sortOrder,
      pagination: limit ? { limit } : undefined,
    });
    return response.records as NumberStat[];
  } catch (error) {
    console.error("Failed to fetch number stats:", error);
    return [];
  }
}

// Recent odd/even statistics
export async function getRecentOddEvenStats(limit: number = 10): Promise<OddEvenStat[]> {
  try {
    const response = await client
      .records("lotto_draw_odd_even_stats")
      .list({
        order: ["-round"],
        pagination: { limit },
      });
    return response.records as OddEvenStat[];
  } catch (error) {
    console.error("Failed to fetch odd/even stats:", error);
    return [];
  }
}

// Recent color statistics
export async function getRecentColorStats(limit: number = 10): Promise<ColorStat[]> {
  try {
    const response = await client
      .records("lotto_draw_color_stats")
      .list({
        order: ["-round"],
        pagination: { limit },
      });
    return response.records as ColorStat[];
  } catch (error) {
    console.error("Failed to fetch color stats:", error);
    return [];
  }
}

// Pair statistics
export async function getPairStats(limit: number = 10): Promise<PairStat[]> {
  try {
    const response = await client.records("lotto_number_pair_stats").list({
      order: ["-pair_count"],
      pagination: { limit },
    });
    return response.records as PairStat[];
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
    // Color averages calculation
    const colorStats = await client.records("lotto_draw_color_stats").list({
      pagination: { limit: 10000 }, // Get all records
    });

    const records = colorStats.records as ColorStat[];
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
        record.green_count
      );
      const minCount = Math.min(
        record.yellow_count,
        record.blue_count,
        record.red_count,
        record.grey_count,
        record.green_count
      );

      if (maxCount <= 1) lowComplexityCount++;
      if (maxCount >= 4) highComplexityCount++;
    });

    // Calculate averages
    const colorAverages = Object.fromEntries(
      Object.entries(colorSums).map(([color, sum]) => [
        color,
        (sum / totalRecords).toFixed(2),
      ])
    );

    // Find most frequent color
    const mostFrequentColorEntry = Object.entries(colorAverages).reduce(
      (max, [color, avg]) => (parseFloat(avg) > parseFloat(max[1]) ? [color, avg] : max),
      ["", "0"]
    );

    return {
      colorAverages,
      colorCountDistribution: distribution,
      totalRecords,
      mostFrequentColor: mostFrequentColorEntry,
      lowComplexityRate: ((lowComplexityCount / totalRecords) * 100).toFixed(1),
      highComplexityRate: ((highComplexityCount / totalRecords) * 100).toFixed(1),
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
  limit?: number
): Promise<any[]> {
  try {
    const tableMap: Record<string, string> = {
      "odd-even": "lotto_draw_odd_even_stats",
      "colors": "lotto_draw_color_stats",
      "sections": "lotto_draw_section_stats",
      "high-low": "lotto_draw_high_low_stats",
      "repeat": "lotto_draw_repeat_stats",
      "unit-digit": "lotto_draw_unit_digit_stats",
      "ac": "lotto_draw_ac_stats",
    };

    const tableName = tableMap[analysisType];
    if (!tableName) {
      console.warn(`Unknown analysis type: ${analysisType}`);
      return [];
    }

    const response = await client.records(tableName).list({
      order: ["-round"],
      pagination: limit ? { limit } : undefined,
    });

    return response.records;
  } catch (error) {
    console.error(`Failed to fetch stats for ${analysisType}:`, error);
    return [];
  }
}

// Export the client for custom queries
export { client as statsClient };
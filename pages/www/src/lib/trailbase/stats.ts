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
      const response = await client
        .records("lotto_draw_odd_even_stats")
        .list({
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
      "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0,
    };

    const sumDistribution: Record<string, number> = {
      "60-80": 0, "81-100": 0, "101-120": 0, "121-140": 0,
      "141-160": 0, "161-180": 0, "181-200": 0, "201-220": 0, "221-240": 0,
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
    const oddCounts = allOddEvenStats.map(r => r.odd_count);
    const evenCounts = allOddEvenStats.map(r => r.even_count);

    const averageOddCount = totalRecords > 0
      ? (oddCounts.reduce((sum, val) => sum + val, 0) / totalRecords).toFixed(2)
      : "0.00";
    const averageEvenCount = totalRecords > 0
      ? (evenCounts.reduce((sum, val) => sum + val, 0) / totalRecords).toFixed(2)
      : "0.00";

    // Most frequent pattern
    const mostFrequentPattern = Object.entries(oddEvenDistribution)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])[0] || ["3", 0];

    // Balance analysis
    const balancedCount = oddEvenDistribution["3"] || 0;
    const extremeCount = (oddEvenDistribution["0"] || 0) + (oddEvenDistribution["6"] || 0);

    const balancedRate = totalRecords > 0
      ? ((balancedCount / totalRecords) * 100).toFixed(1)
      : "0.0";
    const extremeRate = totalRecords > 0
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
      const response = await client
        .records("lotto_number_pair_stats")
        .list({
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
    const pairCounts = allPairStats.map(record => record.pair_count);
    const totalPairs = allPairStats.length;
    const maxPairCount = pairCounts.length > 0 ? Math.max(...pairCounts) : 0;
    const minPairCount = pairCounts.length > 0 ? Math.min(...pairCounts) : 0;
    const averagePairCount = totalPairs > 0
      ? (pairCounts.reduce((sum, count) => sum + count, 0) / totalPairs).toFixed(2)
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
      "0-5": 0, "6-10": 0, "11-15": 0, "16-20": 0,
      "21-25": 0, "26-30": 0, "31+": 0,
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
export async function getAnalysisWithRecent(analysisType: string, limit?: number): Promise<{
  analysisData: any[];
  recentStats: any[];
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

// Export the client for custom queries
export { client as statsClient };
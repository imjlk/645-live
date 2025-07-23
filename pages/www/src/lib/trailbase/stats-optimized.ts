/**
 * Optimized statistics calculations with memoization and batch processing
 * Reduces computational overhead for heavy statistical analysis
 */

import { 
  getNumberStatistics, 
  getOddEvenAnalysis, 
  getColorAnalysis,
  enhancedStatsClient
} from './stats-enhanced.js';
import { useMemo, useAsyncMemo, useBatchProcessor } from '$lib/composables/useMemoization.svelte.ts';
import { withErrorHandling } from '$lib/utils/error-handling.js';
import type { 
  NumberStatistics, 
  OddEvenStatistics, 
  ColorStatistics,
  LottoNumber,
  RoundNumber 
} from '$lib/types/index.js';

// ============= Memoized Statistical Calculations =============

/** Memoized frequency analysis with 10-minute cache */
export const getMemoizedFrequencyAnalysis = useAsyncMemo(
  async (numbers: readonly NumberStatistics[]) => {
    console.log('🧮 Calculating frequency analysis for', numbers.length, 'numbers');
    
    if (numbers.length === 0) {
      return {
        hotNumbers: [],
        coldNumbers: [],
        averageFrequency: 0,
        standardDeviation: 0,
        frequencyDistribution: {},
        outliers: { hot: [], cold: [] },
        trends: { increasing: [], decreasing: [], stable: [] }
      };
    }

    // Calculate frequency statistics
    const frequencies = numbers.map(n => n.frequency);
    const averageFrequency = frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
    
    const variance = frequencies.reduce((sum, freq) => sum + (freq - averageFrequency) ** 2, 0) / frequencies.length;
    const standardDeviation = Math.sqrt(variance);

    // Define thresholds
    const hotThreshold = averageFrequency + (standardDeviation * 0.5);
    const coldThreshold = averageFrequency - (standardDeviation * 0.5);
    const outlierHotThreshold = averageFrequency + (standardDeviation * 1.5);
    const outlierColdThreshold = averageFrequency - (standardDeviation * 1.5);

    // Categorize numbers
    const hotNumbers = numbers.filter(n => n.frequency > hotThreshold);
    const coldNumbers = numbers.filter(n => n.frequency < coldThreshold);
    
    const outliers = {
      hot: numbers.filter(n => n.frequency > outlierHotThreshold),
      cold: numbers.filter(n => n.frequency < outlierColdThreshold)
    };

    // Create frequency distribution
    const frequencyDistribution: Record<string, number> = {};
    frequencies.forEach(freq => {
      const bucket = Math.floor(freq / 10) * 10;
      const key = `${bucket}-${bucket + 9}`;
      frequencyDistribution[key] = (frequencyDistribution[key] || 0) + 1;
    });

    // Analyze trends (simplified for demo)
    const trends = {
      increasing: hotNumbers.slice(0, 5),
      decreasing: coldNumbers.slice(0, 5),
      stable: numbers.filter(n => 
        n.frequency >= coldThreshold && n.frequency <= hotThreshold
      ).slice(0, 10)
    };

    return {
      hotNumbers,
      coldNumbers,
      averageFrequency,
      standardDeviation,
      frequencyDistribution,
      outliers,
      trends
    };
  },
  {
    maxSize: 10,
    ttl: 600000, // 10 minutes
    debug: true,
    namespace: 'frequency-analysis'
  }
);

/** Memoized pattern analysis for odd/even statistics */
export const getMemoizedPatternAnalysis = useMemo(
  (oddEvenStats: readonly OddEvenStatistics[], rounds: number = 50) => {
    console.log('📊 Calculating pattern analysis for', oddEvenStats.length, 'records');
    
    if (oddEvenStats.length === 0) {
      return {
        patterns: {},
        streaks: { longest: 0, current: 0 },
        balance: { score: 0, trend: 'stable' as const },
        predictions: { nextOdds: 0.5, confidence: 0 }
      };
    }

    const recentStats = oddEvenStats.slice(0, rounds);
    
    // Pattern frequency analysis
    const patterns: Record<string, number> = {};
    recentStats.forEach(stat => {
      patterns[stat.ratio] = (patterns[stat.ratio] || 0) + 1;
    });

    // Balance analysis
    const balanceScores = recentStats.map(stat => {
      const [odd, even] = stat.ratio.split(':').map(Number);
      return Math.abs(odd - even) / 6; // Normalized balance score
    });

    const averageBalance = balanceScores.reduce((sum, score) => sum + score, 0) / balanceScores.length;
    
    // Trend analysis
    const recentBalance = balanceScores.slice(0, 10).reduce((sum, score) => sum + score, 0) / Math.min(10, balanceScores.length);
    const olderBalance = balanceScores.slice(10, 20).reduce((sum, score) => sum + score, 0) / Math.min(10, balanceScores.slice(10, 20).length);
    
    const balanceTrend = recentBalance < olderBalance ? 'improving' : 
                        recentBalance > olderBalance ? 'declining' : 'stable';

    // Streak analysis
    let currentStreak = 0;
    let longestStreak = 0;
    let lastPattern = '';
    
    for (const stat of recentStats) {
      if (stat.ratio === lastPattern) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
        lastPattern = stat.ratio;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak);

    // Simple prediction based on patterns
    const mostCommonPattern = Object.entries(patterns)
      .sort(([,a], [,b]) => b - a)[0];
    
    const predictions = {
      nextOdds: mostCommonPattern ? 
        Number.parseInt(mostCommonPattern[0].split(':')[0]) / 6 : 0.5,
      confidence: mostCommonPattern ? 
        mostCommonPattern[1] / recentStats.length : 0
    };

    return {
      patterns,
      streaks: { longest: longestStreak, current: currentStreak },
      balance: { score: averageBalance, trend: balanceTrend },
      predictions
    };
  },
  {
    maxSize: 20,
    ttl: 300000, // 5 minutes
    debug: true,
    namespace: 'pattern-analysis'
  }
);

/** Memoized color distribution complexity analysis */
export const getMemoizedColorComplexity = useMemo(
  (colorStats: readonly ColorStatistics[], rounds: number = 30) => {
    console.log('🎨 Calculating color complexity for', colorStats.length, 'records');
    
    if (colorStats.length === 0) {
      return {
        complexity: { average: 0, trend: 'stable' as const },
        dominance: { color: 'yellow' as const, strength: 0 },
        diversity: { score: 0, rating: 'low' as const },
        transitions: { smooth: 0, abrupt: 0 }
      };
    }

    const recentStats = colorStats.slice(0, rounds);
    
    // Complexity scoring
    const complexityScores = recentStats.map(stat => {
      const counts = Object.values(stat.distribution);
      const maxCount = Math.max(...counts);
      const minCount = Math.min(...counts);
      return (maxCount - minCount) / 6; // Normalized complexity
    });

    const averageComplexity = complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length;
    
    // Trend analysis
    const recentComplexity = complexityScores.slice(0, 10).reduce((sum, score) => sum + score, 0) / Math.min(10, complexityScores.length);
    const olderComplexity = complexityScores.slice(10, 20).reduce((sum, score) => sum + score, 0) / Math.min(10, complexityScores.slice(10, 20).length);
    
    const complexityTrend = recentComplexity > olderComplexity ? 'increasing' : 
                           recentComplexity < olderComplexity ? 'decreasing' : 'stable';

    // Color dominance analysis
    const colorTotals = { yellow: 0, blue: 0, red: 0, grey: 0, green: 0 };
    recentStats.forEach(stat => {
      Object.entries(stat.distribution).forEach(([color, count]) => {
        colorTotals[color as keyof typeof colorTotals] += count;
      });
    });

    const dominantColor = Object.entries(colorTotals)
      .sort(([,a], [,b]) => b - a)[0];
    
    const totalBalls = Object.values(colorTotals).reduce((sum, count) => sum + count, 0);
    const dominanceStrength = dominantColor[1] / totalBalls;

    // Diversity analysis
    const diversityScores = recentStats.map(stat => {
      const counts = Object.values(stat.distribution);
      const nonZero = counts.filter(c => c > 0).length;
      return nonZero / 5; // Normalized diversity (max 5 colors)
    });

    const averageDiversity = diversityScores.reduce((sum, score) => sum + score, 0) / diversityScores.length;
    const diversityRating = averageDiversity > 0.8 ? 'high' : 
                           averageDiversity > 0.6 ? 'medium' : 'low';

    // Transition analysis
    let smoothTransitions = 0;
    let abruptTransitions = 0;
    
    for (let i = 1; i < recentStats.length; i++) {
      const current = recentStats[i];
      const previous = recentStats[i - 1];
      
      const changes = Object.keys(current.distribution).filter(color => {
        const diff = Math.abs(
          current.distribution[color as keyof typeof current.distribution] - 
          previous.distribution[color as keyof typeof previous.distribution]
        );
        return diff > 0;
      }).length;
      
      if (changes <= 2) smoothTransitions++;
      else abruptTransitions++;
    }

    return {
      complexity: { average: averageComplexity, trend: complexityTrend },
      dominance: { color: dominantColor[0] as keyof typeof colorTotals, strength: dominanceStrength },
      diversity: { score: averageDiversity, rating: diversityRating },
      transitions: { smooth: smoothTransitions, abrupt: abruptTransitions }
    };
  },
  {
    maxSize: 15,
    ttl: 300000, // 5 minutes
    debug: true,
    namespace: 'color-complexity'
  }
);

// ============= Batch Processing for Large Datasets =============

/** Optimized batch fetcher for large statistical datasets */
export const createStatsBatchProcessor = () => {
  return useBatchProcessor(
    async (rounds: RoundNumber[]) => {
      console.log('📦 Processing batch of', rounds.length, 'rounds');
      
      // Fetch stats for each round in parallel
      const results = await Promise.all(
        rounds.map(async (round) => {
          try {
            const [oddEven, colors] = await Promise.all([
              enhancedStatsClient.records('lotto_draw_odd_even_stats').list({
                filters: [{ field: 'round', op: '=', value: round }],
                pagination: { limit: 1 }
              }),
              enhancedStatsClient.records('lotto_draw_color_stats').list({
                filters: [{ field: 'round', op: '=', value: round }],
                pagination: { limit: 1 }
              })
            ]);

            return {
              round,
              oddEven: oddEven.records[0] || null,
              colors: colors.records[0] || null,
              success: true
            };
          } catch (error) {
            console.warn(`Failed to fetch stats for round ${round}:`, error);
            return {
              round,
              oddEven: null,
              colors: null,
              success: false
            };
          }
        })
      );

      return results;
    },
    {
      batchSize: 20,
      maxConcurrent: 3
    }
  );
};

// ============= Optimized Aggregate Functions =============

/** Get comprehensive statistics with intelligent caching */
export const getOptimizedStats = useAsyncMemo(
  async (options: {
    includeNumbers?: boolean;
    includePatterns?: boolean;
    includeColors?: boolean;
    rounds?: number;
  } = {}) => {
    console.log('📈 Fetching optimized comprehensive stats');
    
    const {
      includeNumbers = true,
      includePatterns = true,
      includeColors = true,
      rounds = 50
    } = options;

    const results: {
      numbers?: Awaited<ReturnType<typeof getMemoizedFrequencyAnalysis>>;
      patterns?: ReturnType<typeof getMemoizedPatternAnalysis>;
      colors?: ReturnType<typeof getMemoizedColorComplexity>;
      metadata: {
        calculationTime: number;
        cacheHits: number;
        dataPoints: number;
      };
    } = {
      metadata: {
        calculationTime: 0,
        cacheHits: 0,
        dataPoints: 0
      }
    };

    const startTime = performance.now();
    let cacheHits = 0;

    try {
      const promises: Promise<unknown>[] = [];
      
      if (includeNumbers) {
        promises.push(
          getNumberStatistics({ limit: 45 }).then(async (numbers) => {
            const analysis = await getMemoizedFrequencyAnalysis(numbers);
            results.numbers = analysis;
            if (getMemoizedFrequencyAnalysis.cache.has(numbers)) cacheHits++;
            results.metadata.dataPoints += numbers.length;
          })
        );
      }

      if (includePatterns) {
        promises.push(
          getOddEvenAnalysis(rounds).then((oddEven) => {
            const analysis = getMemoizedPatternAnalysis(oddEven, rounds);
            results.patterns = analysis;
            if (getMemoizedPatternAnalysis.cache.has(oddEven, rounds)) cacheHits++;
            results.metadata.dataPoints += oddEven.length;
          })
        );
      }

      if (includeColors) {
        promises.push(
          getColorAnalysis(rounds).then((colors) => {
            const analysis = getMemoizedColorComplexity(colors, rounds);
            results.colors = analysis;
            if (getMemoizedColorComplexity.cache.has(colors, rounds)) cacheHits++;
            results.metadata.dataPoints += colors.length;
          })
        );
      }

      await Promise.all(promises);
      
      const endTime = performance.now();
      results.metadata.calculationTime = endTime - startTime;
      results.metadata.cacheHits = cacheHits;

      console.log('✅ Optimized stats calculation completed:', results.metadata);
      return results;
      
    } catch (error) {
      console.error('❌ Failed to calculate optimized stats:', error);
      throw error;
    }
  },
  {
    maxSize: 10,
    ttl: 900000, // 15 minutes for comprehensive stats
    debug: true,
    namespace: 'optimized-stats',
    keyGenerator: (options) => JSON.stringify(options)
  }
);

// ============= Cache Management Utilities =============

/** Clear all statistical caches */
export function clearStatsCache(): void {
  console.log('🧹 Clearing all statistical caches');
  
  getMemoizedFrequencyAnalysis.cache.clear();
  getMemoizedPatternAnalysis.cache.clear();
  getMemoizedColorComplexity.cache.clear();
  getOptimizedStats.cache.clear();
  
  console.log('✅ All caches cleared');
}

/** Get cache performance metrics */
export function getCacheMetrics() {
  return {
    frequencyAnalysis: {
      stats: getMemoizedFrequencyAnalysis.cache.getStats(),
      hitRate: getMemoizedFrequencyAnalysis.cache.getHitRate()
    },
    patternAnalysis: {
      stats: getMemoizedPatternAnalysis.cache.getStats(),
      hitRate: getMemoizedPatternAnalysis.cache.getHitRate()
    },
    colorComplexity: {
      stats: getMemoizedColorComplexity.cache.getStats(),
      hitRate: getMemoizedColorComplexity.cache.getHitRate()
    },
    optimizedStats: {
      stats: getOptimizedStats.cache.getStats(),
      hitRate: getOptimizedStats.cache.getHitRate()
    }
  };
}

// ============= Preloading Strategies =============

/** Preload commonly requested statistics */
export const preloadCommonStats = withErrorHandling(
  async () => {
    console.log('🚀 Preloading common statistics');
    
    const commonQueries = [
      { includeNumbers: true, includePatterns: true, rounds: 50 },
      { includeNumbers: true, includeColors: true, rounds: 30 },
      { includePatterns: true, includeColors: true, rounds: 20 }
    ];

    const preloadPromises = commonQueries.map(query => 
      getOptimizedStats.cache.preload(query)
    );

    await Promise.allSettled(preloadPromises);
    
    console.log('✅ Common statistics preloaded');
  },
  'preloadCommonStats'
);

export { 
  useBatchProcessor,
  createStatsBatchProcessor 
};
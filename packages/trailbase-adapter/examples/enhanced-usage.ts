/**
 * Example: Enhanced features usage (pagination, search, cache)
 */

import { createAdapter } from '../src/adapters/index.js';

interface LottoRecord {
	id: number;
	round: number;
	numbers: number[];
	bonus: number;
	draw_date: string;
	created_at: string;
	updated_at: string;
}

async function enhancedExample() {
	// Create adapter with cache enabled
	const adapter = createAdapter<LottoRecord>('trailbase', {
		url: 'http://localhost:4000',
		cache: { enabled: true, ttl: 10 * 60 * 1000 }, // 10 minutes
	});

	// Connect
	await adapter.connect();

	// Check if enhanced features are available
	if (!adapter.records || !adapter.cacheUtils) {
		throw new Error('Enhanced features not available');
	}

	try {
		// 1. Pagination example
		console.log('📄 Paginating lotto draws...');
		const page1 = await adapter.records.paginate('lotto_draws', 1, 10, {
			order: ['-draw_date']
		});
		console.log(`Page 1: ${page1.records.length} records, Total: ${page1.total}`);
		console.log(`Has next: ${page1.hasNext}, Has prev: ${page1.hasPrev}`);

		// 2. Search example
		console.log('🔍 Searching lotto draws...');
		const searchResults = await adapter.records.search('lotto_draws', {
			query: '2024',
			fields: ['draw_date', 'round'],
			limit: 5
		});
		console.log(`Found ${searchResults.length} records matching "2024"`);

		// 3. Utility methods
		console.log('🔧 Using utility methods...');
		
		// Count records
		const totalDraws = await adapter.records.count('lotto_draws');
		console.log(`Total draws: ${totalDraws}`);

		// Get recent records
		const recentDraws = await adapter.records.getRecent('lotto_draws', 5);
		console.log(`Recent draws: ${recentDraws.length}`);

		// Find first/last
		const firstDraw = await adapter.records.findFirst('lotto_draws', {
			order: ['draw_date']
		});
		const lastDraw = await adapter.records.findLast('lotto_draws', 'draw_date');
		console.log(`First draw: ${firstDraw?.round}, Last draw: ${lastDraw?.round}`);

		// 4. Cache utilities
		console.log('💾 Cache utilities...');
		
		// Warm cache with common queries
		await adapter.cacheUtils.warmCache('lotto_draws', [
			{ order: ['-draw_date'], pagination: { limit: 10 } },
			{ order: ['-round'], pagination: { limit: 20 } },
		]);

		// Cache stats
		const cacheStats = adapter.cacheUtils.getCacheStats();
		console.log(`Cache: ${cacheStats.size} entries, ${cacheStats.memoryUsage}`);

		// Preload common queries
		await adapter.cacheUtils.preloadCommonQueries('lotto_draws');

		// 5. Advanced caching
		console.log('🚀 Advanced caching...');
		
		// Manual cache management
		adapter.cacheUtils.setCache('custom:latest', lastDraw, 60 * 1000); // 1 minute TTL
		const cached = adapter.cacheUtils.getFromCache<LottoRecord>('custom:latest');
		console.log(`Cached latest: ${cached?.round}`);

		// Invalidate patterns
		adapter.cacheUtils.invalidatePattern('lotto_draws:.*');
		console.log('Invalidated lotto_draws cache');

	} catch (error) {
		console.error('❌ Enhanced features error:', error);
	}

	// Cleanup
	await adapter.destroy();
}

// Run example
if (import.meta.main) {
	enhancedExample().catch(console.error);
}

export { enhancedExample };
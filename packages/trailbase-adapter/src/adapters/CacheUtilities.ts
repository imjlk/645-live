/**
 * Cache utilities for TrailBase adapter
 */

import type { CacheUtilities, QueryOptions, BaseRecord } from '../types/index.js';
import type { TrailBaseClient } from './client-types.js';

interface CacheEntry<T = unknown> {
	data: T;
	timestamp: number;
	ttl: number;
}

export class TrailBaseCacheUtilities<T extends BaseRecord = BaseRecord> implements CacheUtilities {
	private cache = new Map<string, CacheEntry>();
	private client: TrailBaseClient<T>;
	private defaultTTL: number;

	constructor(client: TrailBaseClient<T>, defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
		this.client = client;
		this.defaultTTL = defaultTTL;
		
		// Clean up expired entries every minute
		setInterval(() => this.cleanExpired(), 60 * 1000);
	}

	async warmCache(table: string, preloadQueries: QueryOptions[]): Promise<void> {
		if (!this.client) {
			throw new Error('TrailBase client not initialized');
		}

		try {
			const api = this.client.records(table);
			
			// Execute all preload queries in parallel
			const promises = preloadQueries.map(async (queryOptions) => {
				const cacheKey = this.generateCacheKey(table, queryOptions);
				
				try {
					const response = await api.list(queryOptions);
					this.setCache(cacheKey, response, this.defaultTTL);
				} catch (error) {
					console.warn(`Failed to warm cache for ${cacheKey}:`, error);
				}
			});

			await Promise.allSettled(promises);
		} catch (error) {
			console.error(`Failed to warm cache for table ${table}:`, error);
		}
	}

	invalidatePattern(pattern: string): void {
		const regex = new RegExp(pattern);
		
		for (const key of this.cache.keys()) {
			if (regex.test(key)) {
				this.cache.delete(key);
			}
		}
	}

	getFromCache<T>(key: string): T | null {
		const entry = this.cache.get(key);
		
		if (!entry) {
			return null;
		}

		// Check if entry has expired
		if (Date.now() - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return null;
		}

		return entry.data as T;
	}

	setCache<T>(key: string, data: T, ttl?: number): void {
		const entry: CacheEntry<T> = {
			data,
			timestamp: Date.now(),
			ttl: ttl || this.defaultTTL,
		};

		this.cache.set(key, entry);
	}

	// Additional utility methods
	clearCache(): void {
		this.cache.clear();
	}

	getCacheSize(): number {
		return this.cache.size;
	}

	getCacheKeys(): string[] {
		return Array.from(this.cache.keys());
	}

	getCacheStats(): { size: number; keys: string[]; memoryUsage: string } {
		const keys = this.getCacheKeys();
		const memoryUsage = this.estimateMemoryUsage();
		
		return {
			size: this.cache.size,
			keys,
			memoryUsage,
		};
	}

	invalidateTable(table: string): void {
		this.invalidatePattern(`^${table}:`);
	}

	preloadCommonQueries(table: string): Promise<void> {
		const commonQueries: QueryOptions[] = [
			// Recent records
			{ order: ['-created_at'], pagination: { limit: 10 } },
			{ order: ['-updated_at'], pagination: { limit: 10 } },
			// First page
			{ pagination: { limit: 20, offset: 0 } },
		];

		return this.warmCache(table, commonQueries);
	}

	// Private helper methods
	private generateCacheKey(table: string, options: QueryOptions = {}): string {
		const key = `${table}:${JSON.stringify(options)}`;
		return key;
	}

	private cleanExpired(): void {
		const now = Date.now();
		
		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > entry.ttl) {
				this.cache.delete(key);
			}
		}
	}

	private estimateMemoryUsage(): string {
		let totalSize = 0;
		
		for (const entry of this.cache.values()) {
			// Rough estimation of memory usage
			totalSize += JSON.stringify(entry.data).length * 2; // UTF-16 encoding
		}

		if (totalSize < 1024) {
			return `${totalSize} bytes`;
		} else if (totalSize < 1024 * 1024) {
			return `${(totalSize / 1024).toFixed(2)} KB`;
		} else {
			return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
		}
	}
}

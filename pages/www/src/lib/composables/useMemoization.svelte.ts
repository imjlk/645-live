// @ts-nocheck
/**
 * Advanced memoization system for heavy calculations
 * Provides intelligent caching, invalidation, and memory management
 */

interface MemoOptions {
	/** Maximum cache size before LRU eviction */
	maxSize?: number;
	/** TTL in milliseconds (0 = never expire) */
	ttl?: number;
	/** Custom cache key generator */
	keyGenerator?: (...args: unknown[]) => string;
	/** Whether to enable debug logging */
	debug?: boolean;
	/** Storage type for persistence */
	storage?: "memory" | "sessionStorage" | "localStorage";
	/** Namespace for storage keys */
	namespace?: string;
}

interface CacheEntry<T> {
	value: T;
	timestamp: number;
	accessCount: number;
	lastAccessed: number;
	size?: number;
}

interface CacheStats {
	hits: number;
	misses: number;
	evictions: number;
	totalSize: number;
	entries: number;
}

class AdvancedMemoCache<T> {
	private cache = new Map<string, CacheEntry<T>>();
	private stats: CacheStats = {
		hits: 0,
		misses: 0,
		evictions: 0,
		totalSize: 0,
		entries: 0,
	};

	constructor(private options: Required<MemoOptions>) {}

	private log(...args: unknown[]) {
		if (this.options.debug) {
			console.log("[MemoCache]", ...args);
		}
	}

	private generateKey(...args: unknown[]): string {
		if (this.options.keyGenerator) {
			return this.options.keyGenerator(...args);
		}
		return JSON.stringify(args);
	}

	private isExpired(entry: CacheEntry<T>): boolean {
		if (this.options.ttl === 0) return false;
		return Date.now() - entry.timestamp > this.options.ttl;
	}

	private estimateSize(value: T): number {
		try {
			return JSON.stringify(value).length * 2; // Rough estimate in bytes
		} catch {
			return 1000; // Default size estimate
		}
	}

	private evictLRU(): void {
		if (this.cache.size === 0) return;

		let lruKey: string | null = null;
		let oldestAccess = Date.now();

		for (const [key, entry] of this.cache) {
			if (entry.lastAccessed < oldestAccess) {
				oldestAccess = entry.lastAccessed;
				lruKey = key;
			}
		}

		if (lruKey) {
			const entry = this.cache.get(lruKey)!;
			this.cache.delete(lruKey);
			this.stats.evictions++;
			this.stats.totalSize -= entry.size || 0;
			this.stats.entries--;
			this.log(`Evicted LRU entry: ${lruKey}`);
		}
	}

	private saveToStorage(key: string, entry: CacheEntry<T>): void {
		if (this.options.storage === "memory") return;

		try {
			const storageKey = `${this.options.namespace}:${key}`;
			const data = JSON.stringify({
				value: entry.value,
				timestamp: entry.timestamp,
				accessCount: entry.accessCount,
				lastAccessed: entry.lastAccessed,
			});

			if (this.options.storage === "localStorage") {
				localStorage.setItem(storageKey, data);
			} else if (this.options.storage === "sessionStorage") {
				sessionStorage.setItem(storageKey, data);
			}
		} catch (error) {
			this.log("Failed to save to storage:", error);
		}
	}

	private loadFromStorage(key: string): CacheEntry<T> | null {
		if (this.options.storage === "memory") return null;

		try {
			const storageKey = `${this.options.namespace}:${key}`;
			let data: string | null = null;

			if (this.options.storage === "localStorage") {
				data = localStorage.getItem(storageKey);
			} else if (this.options.storage === "sessionStorage") {
				data = sessionStorage.getItem(storageKey);
			}

			if (!data) return null;

			const parsed = JSON.parse(data);
			const entry: CacheEntry<T> = {
				value: parsed.value,
				timestamp: parsed.timestamp,
				accessCount: parsed.accessCount,
				lastAccessed: parsed.lastAccessed,
				size: this.estimateSize(parsed.value),
			};

			// Check if expired
			if (this.isExpired(entry)) {
				this.removeFromStorage(key);
				return null;
			}

			return entry;
		} catch (error) {
			this.log("Failed to load from storage:", error);
			return null;
		}
	}

	private removeFromStorage(key: string): void {
		if (this.options.storage === "memory") return;

		try {
			const storageKey = `${this.options.namespace}:${key}`;
			if (this.options.storage === "localStorage") {
				localStorage.removeItem(storageKey);
			} else if (this.options.storage === "sessionStorage") {
				sessionStorage.removeItem(storageKey);
			}
		} catch (error) {
			this.log("Failed to remove from storage:", error);
		}
	}

	get(key: string): T | undefined {
		// Try memory cache first
		let entry = this.cache.get(key);

		// If not in memory, try storage
		if (!entry && this.options.storage !== "memory") {
			entry = this.loadFromStorage(key);
			if (entry) {
				this.cache.set(key, entry);
				this.stats.entries++;
				this.stats.totalSize += entry.size || 0;
			}
		}

		if (!entry) {
			this.stats.misses++;
			this.log(`Cache miss: ${key}`);
			return undefined;
		}

		if (this.isExpired(entry)) {
			this.cache.delete(key);
			this.removeFromStorage(key);
			this.stats.misses++;
			this.stats.entries--;
			this.stats.totalSize -= entry.size || 0;
			this.log(`Cache expired: ${key}`);
			return undefined;
		}

		// Update access info
		entry.accessCount++;
		entry.lastAccessed = Date.now();
		this.stats.hits++;
		this.log(`Cache hit: ${key} (${entry.accessCount} accesses)`);

		return entry.value;
	}

	set(key: string, value: T): void {
		const size = this.estimateSize(value);
		const entry: CacheEntry<T> = {
			value,
			timestamp: Date.now(),
			accessCount: 1,
			lastAccessed: Date.now(),
			size,
		};

		// Check if we need to evict
		while (this.cache.size >= this.options.maxSize && this.cache.size > 0) {
			this.evictLRU();
		}

		// Remove existing entry if present
		const existing = this.cache.get(key);
		if (existing) {
			this.stats.totalSize -= existing.size || 0;
		} else {
			this.stats.entries++;
		}

		this.cache.set(key, entry);
		this.stats.totalSize += size;

		// Save to persistent storage if configured
		this.saveToStorage(key, entry);

		this.log(`Cache set: ${key} (size: ${size} bytes)`);
	}

	has(key: string): boolean {
		return this.get(key) !== undefined;
	}

	delete(key: string): boolean {
		const entry = this.cache.get(key);
		if (entry) {
			this.cache.delete(key);
			this.removeFromStorage(key);
			this.stats.entries--;
			this.stats.totalSize -= entry.size || 0;
			this.log(`Cache delete: ${key}`);
			return true;
		}
		return false;
	}

	clear(): void {
		this.cache.clear();
		this.stats = {
			hits: 0,
			misses: 0,
			evictions: 0,
			totalSize: 0,
			entries: 0,
		};

		// Clear storage if configured
		if (this.options.storage !== "memory") {
			try {
				const storage =
					this.options.storage === "localStorage"
						? localStorage
						: sessionStorage;
				const keysToRemove: string[] = [];

				for (let i = 0; i < storage.length; i++) {
					const key = storage.key(i);
					if (key?.startsWith(`${this.options.namespace}:`)) {
						keysToRemove.push(key);
					}
				}

				for (const key of keysToRemove) {
					storage.removeItem(key);
				}
			} catch (error) {
				this.log("Failed to clear storage:", error);
			}
		}

		this.log("Cache cleared");
	}

	getStats(): CacheStats {
		return { ...this.stats };
	}

	getHitRate(): number {
		const total = this.stats.hits + this.stats.misses;
		return total > 0 ? this.stats.hits / total : 0;
	}
}

/**
 * Create a memoized function with advanced caching capabilities
 */
export function useMemo<TArgs extends readonly unknown[], TReturn>(
	fn: (...args: TArgs) => TReturn,
	options: MemoOptions = {},
): {
	(...args: TArgs): TReturn;
	cache: {
		clear: () => void;
		delete: (...args: TArgs) => boolean;
		has: (...args: TArgs) => boolean;
		getStats: () => CacheStats;
		getHitRate: () => number;
	};
} {
	const defaultOptions: Required<MemoOptions> = {
		maxSize: 100,
		ttl: 300000, // 5 minutes
		keyGenerator: (...args) => JSON.stringify(args),
		debug: false,
		storage: "memory",
		namespace: "memo",
		...options,
	};

	const cache = new AdvancedMemoCache<TReturn>(defaultOptions);

	const memoizedFn = (...args: TArgs): TReturn => {
		const key = cache["generateKey"](...args);

		const cached = cache.get(key);
		if (cached !== undefined) {
			return cached;
		}

		const result = fn(...args);
		cache.set(key, result);
		return result;
	};

	memoizedFn.cache = {
		clear: () => cache.clear(),
		delete: (...args: TArgs) => cache.delete(cache["generateKey"](...args)),
		has: (...args: TArgs) => cache.has(cache["generateKey"](...args)),
		getStats: () => cache.getStats(),
		getHitRate: () => cache.getHitRate(),
	};

	return memoizedFn;
}

/**
 * Create a memoized async function with advanced caching
 */
export function useAsyncMemo<TArgs extends readonly unknown[], TReturn>(
	fn: (...args: TArgs) => Promise<TReturn>,
	options: MemoOptions = {},
): {
	(...args: TArgs): Promise<TReturn>;
	cache: {
		clear: () => void;
		delete: (...args: TArgs) => boolean;
		has: (...args: TArgs) => boolean;
		getStats: () => CacheStats;
		getHitRate: () => number;
		preload: (...args: TArgs) => Promise<TReturn>;
	};
} {
	const defaultOptions: Required<MemoOptions> = {
		maxSize: 50,
		ttl: 300000, // 5 minutes
		keyGenerator: (...args) => JSON.stringify(args),
		debug: false,
		storage: "memory",
		namespace: "async-memo",
		...options,
	};

	const cache = new AdvancedMemoCache<Promise<TReturn>>(defaultOptions);
	const resolvedCache = new AdvancedMemoCache<TReturn>(defaultOptions);

	const memoizedFn = async (...args: TArgs): Promise<TReturn> => {
		const key = cache["generateKey"](...args);

		// Check resolved cache first
		const resolved = resolvedCache.get(key);
		if (resolved !== undefined) {
			return resolved;
		}

		// Check if we have a pending promise
		const cached = cache.get(key);
		if (cached !== undefined) {
			return cached;
		}

		// Create and cache the promise
		const promise = fn(...args);
		cache.set(key, promise);

		try {
			const result = await promise;
			resolvedCache.set(key, result);
			return result;
		} catch (error) {
			// Remove failed promise from cache
			cache.delete(key);
			throw error;
		}
	};

	memoizedFn.cache = {
		clear: () => {
			cache.clear();
			resolvedCache.clear();
		},
		delete: (...args: TArgs) => {
			const key = cache["generateKey"](...args);
			const deleted1 = cache.delete(key);
			const deleted2 = resolvedCache.delete(key);
			return deleted1 || deleted2;
		},
		has: (...args: TArgs) => {
			const key = cache["generateKey"](...args);
			return cache.has(key) || resolvedCache.has(key);
		},
		getStats: () => {
			const stats1 = cache.getStats();
			const stats2 = resolvedCache.getStats();
			return {
				hits: stats1.hits + stats2.hits,
				misses: stats1.misses + stats2.misses,
				evictions: stats1.evictions + stats2.evictions,
				totalSize: stats1.totalSize + stats2.totalSize,
				entries: stats1.entries + stats2.entries,
			};
		},
		getHitRate: () => {
			const stats = memoizedFn.cache.getStats();
			const total = stats.hits + stats.misses;
			return total > 0 ? stats.hits / total : 0;
		},
		preload: async (...args: TArgs) => {
			return memoizedFn(...args);
		},
	};

	return memoizedFn;
}

/**
 * Specialized memo hook for expensive statistics calculations
 */
export function useStatsMemo<TArgs extends readonly unknown[], TReturn>(
	calculator: (...args: TArgs) => TReturn,
	dependencies: TArgs,
	options: MemoOptions & {
		/** Whether to recalculate when dependencies change */
		reactive?: boolean;
	} = {},
): {
	readonly value: TReturn | null;
	readonly isCalculating: boolean;
	readonly lastCalculated: Date | null;
	readonly hitRate: number;
	recalculate: () => TReturn;
	invalidate: () => void;
} {
	const { reactive = true, ...memoOptions } = options;

	const memoized = useMemo(calculator, {
		maxSize: 20,
		ttl: 600000, // 10 minutes for stats
		debug: true,
		namespace: "stats",
		...memoOptions,
	});

	let value = $state<TReturn | null>(null);
	let isCalculating = $state(false);
	let lastCalculated = $state<Date | null>(null);
	let lastDeps = $state<TArgs | null>(null);

	const calculate = () => {
		if (isCalculating) return value;

		isCalculating = true;
		try {
			const result = memoized(...dependencies);
			value = result;
			lastCalculated = new Date();
			lastDeps = [...dependencies] as TArgs;
			return result;
		} finally {
			isCalculating = false;
		}
	};

	const recalculate = () => {
		memoized.cache.delete(...dependencies);
		return calculate();
	};

	const invalidate = () => {
		memoized.cache.clear();
		value = null;
		lastCalculated = null;
	};

	// Reactive recalculation when dependencies change - 무한 루프 방지
	$effect(() => {
		if (!reactive || isCalculating) return;

		const currentDeps = JSON.stringify(dependencies);
		const prevDeps = lastDeps ? JSON.stringify(lastDeps) : null;

		if (!lastDeps || currentDeps !== prevDeps) {
			// 계산 중 플래그로 재귀 호출 방지
			if (!isCalculating) {
				calculate();
			}
		}
	});

	// Initial calculation
	if (!value && !isCalculating) {
		calculate();
	}

	return {
		get value() {
			return value;
		},
		get isCalculating() {
			return isCalculating;
		},
		get lastCalculated() {
			return lastCalculated;
		},
		get hitRate() {
			return memoized.cache.getHitRate();
		},
		recalculate,
		invalidate,
	};
}

/**
 * Memory-conscious batch processing with progress tracking
 */
export function useBatchProcessor<TInput, TOutput>(
	processor: (batch: TInput[]) => Promise<TOutput[]>,
	options: {
		batchSize?: number;
		maxConcurrent?: number;
		onProgress?: (processed: number, total: number) => void;
	} = {},
) {
	const { batchSize = 100, maxConcurrent = 3, onProgress } = options;

	let isProcessing = $state(false);
	let progress = $state({ processed: 0, total: 0 });
	let results = $state<TOutput[]>([]);

	const processBatches = async (items: TInput[]): Promise<TOutput[]> => {
		if (isProcessing) {
			throw new Error("Batch processing already in progress");
		}

		isProcessing = true;
		progress = { processed: 0, total: items.length };
		results = [];

		try {
			const batches: TInput[][] = [];
			for (let i = 0; i < items.length; i += batchSize) {
				batches.push(items.slice(i, i + batchSize));
			}

			const processBatch = async (batch: TInput[], index: number) => {
				const batchResults = await processor(batch);
				results = [...results, ...batchResults];
				progress = {
					processed: progress.processed + batch.length,
					total: progress.total,
				};

				if (onProgress) {
					onProgress(progress.processed, progress.total);
				}
			};

			// Process batches with concurrency limit
			const semaphore = new Array(maxConcurrent).fill(null);
			let batchIndex = 0;

			await Promise.all(
				semaphore.map(async () => {
					while (batchIndex < batches.length) {
						const currentIndex = batchIndex++;
						await processBatch(batches[currentIndex], currentIndex);
					}
				}),
			);

			return results;
		} finally {
			isProcessing = false;
		}
	};

	return {
		get isProcessing() {
			return isProcessing;
		},
		get progress() {
			return progress;
		},
		get results() {
			return results;
		},
		process: processBatches,
	};
}

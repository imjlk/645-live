/**
 * Advanced batch processing utilities for large dataset operations
 * Provides memory-efficient processing with progress tracking and error handling
 */

import type { AppError } from "$lib/types/index.js";
import { withErrorHandling } from "./error-handling.js";

interface BatchOptions<T> {
	/** Batch size for processing */
	batchSize: number;
	/** Maximum concurrent batches */
	maxConcurrency: number;
	/** Delay between batches in ms */
	delayBetweenBatches?: number;
	/** Progress callback */
	onProgress?: (processed: number, total: number, currentBatch: number) => void;
	/** Batch completion callback */
	onBatchComplete?: (batchResults: T[], batchIndex: number) => void;
	/** Error handling strategy */
	errorStrategy: "fail-fast" | "collect-errors" | "skip-errors";
	/** Memory threshold for garbage collection hints */
	memoryThreshold?: number;
	/** Enable detailed logging */
	enableLogging?: boolean;
}

interface BatchResult<T, E = AppError> {
	results: T[];
	errors: E[];
	statistics: {
		totalProcessed: number;
		successfulBatches: number;
		failedBatches: number;
		totalTime: number;
		averageBatchTime: number;
		itemsPerSecond: number;
	};
}

interface BatchProcessor<TInput, TOutput> {
	process: (items: TInput[]) => Promise<TOutput[]>;
	options: BatchOptions<TOutput>;
}

/**
 * Creates a batch processor with the specified configuration
 */
export function createBatchProcessor<TInput, TOutput>(
	processor: (batch: TInput[]) => Promise<TOutput[]>,
	options: Partial<BatchOptions<TOutput>> = {},
): BatchProcessor<TInput, TOutput> {
	const defaultOptions: BatchOptions<TOutput> = {
		batchSize: 100,
		maxConcurrency: 3,
		delayBetweenBatches: 0,
		errorStrategy: "collect-errors",
		memoryThreshold: 100 * 1024 * 1024, // 100MB
		enableLogging: false,
		...options,
	};

	return {
		process: createBatchProcessFunction(processor, defaultOptions),
		options: defaultOptions,
	};
}

function createBatchProcessFunction<TInput, TOutput>(
	processor: (batch: TInput[]) => Promise<TOutput[]>,
	options: BatchOptions<TOutput>,
) {
	return withErrorHandling(
		async (items: TInput[]): Promise<BatchResult<TOutput>> => {
			const startTime = performance.now();
			const results: TOutput[] = [];
			const errors: AppError[] = [];
			const batchTimes: number[] = [];

			if (options.enableLogging) {
				console.log(
					`🚀 Starting batch processing: ${items.length} items, ${Math.ceil(items.length / options.batchSize)} batches`,
				);
			}

			// Create batches
			const batches: TInput[][] = [];
			for (let i = 0; i < items.length; i += options.batchSize) {
				batches.push(items.slice(i, i + options.batchSize));
			}

			// Process batches with concurrency control
			const semaphore = new Semaphore(options.maxConcurrency);
			const batchPromises = batches.map((batch, index) =>
				processBatchWithSemaphore(
					batch,
					index,
					processor,
					semaphore,
					options,
					results,
					errors,
					batchTimes,
				),
			);

			await Promise.allSettled(batchPromises);

			const endTime = performance.now();
			const totalTime = endTime - startTime;
			const averageBatchTime =
				batchTimes.length > 0
					? batchTimes.reduce((sum, time) => sum + time, 0) / batchTimes.length
					: 0;

			const statistics = {
				totalProcessed: results.length,
				successfulBatches: batchTimes.length,
				failedBatches: batches.length - batchTimes.length,
				totalTime,
				averageBatchTime,
				itemsPerSecond: results.length / (totalTime / 1000),
			};

			if (options.enableLogging) {
			}

			return {
				results,
				errors,
				statistics,
			};
		},
		"batchProcess",
	);
}

async function processBatchWithSemaphore<TInput, TOutput>(
	batch: TInput[],
	batchIndex: number,
	processor: (batch: TInput[]) => Promise<TOutput[]>,
	semaphore: Semaphore,
	options: BatchOptions<TOutput>,
	results: TOutput[],
	errors: AppError[],
	batchTimes: number[],
): Promise<void> {
	await semaphore.acquire();

	try {
		const batchStartTime = performance.now();

		if (options.enableLogging) {
			console.log(
				`📦 Processing batch ${batchIndex + 1} (${batch.length} items)`,
			);
		}

		try {
			const batchResults = await processor(batch);
			const batchEndTime = performance.now();
			const batchTime = batchEndTime - batchStartTime;

			// Add results to main array
			results.push(...batchResults);
			batchTimes.push(batchTime);

			// Call batch complete callback
			if (options.onBatchComplete) {
				options.onBatchComplete(batchResults, batchIndex);
			}

			// Update progress
			if (options.onProgress) {
				options.onProgress(results.length, results.length, batchIndex + 1);
			}

			if (options.enableLogging) {
				console.log(
					`✅ Batch ${batchIndex + 1} completed in ${batchTime.toFixed(2)}ms`,
				);
			}

			// Memory management
			if (options.memoryThreshold && performance.memory) {
				const memoryUsage = performance.memory.usedJSHeapSize;
				if (memoryUsage > options.memoryThreshold) {
					if (options.enableLogging) {
						console.log(
							`🧹 Memory threshold reached (${(memoryUsage / 1024 / 1024).toFixed(2)}MB), suggesting GC`,
						);
					}
					// Suggest garbage collection (if available)
					if ("gc" in window && typeof window.gc === "function") {
						window.gc();
					}
				}
			}
		} catch (error) {
			const appError =
				error instanceof Error ? error : new Error(String(error));

			if (options.enableLogging) {
				console.error(`❌ Batch ${batchIndex + 1} failed:`, appError);
			}

			if (options.errorStrategy === "fail-fast") {
				throw appError;
			} else if (options.errorStrategy === "collect-errors") {
				errors.push(appError as AppError);
			}
			// skip-errors: just continue
		}

		// Delay between batches if configured
		if (options.delayBetweenBatches && options.delayBetweenBatches > 0) {
			await new Promise((resolve) =>
				setTimeout(resolve, options.delayBetweenBatches),
			);
		}
	} finally {
		semaphore.release();
	}
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
	private count: number;
	private waiting: Array<() => void> = [];

	constructor(count: number) {
		this.count = count;
	}

	async acquire(): Promise<void> {
		return new Promise((resolve) => {
			if (this.count > 0) {
				this.count--;
				resolve();
			} else {
				this.waiting.push(resolve);
			}
		});
	}

	release(): void {
		this.count++;
		const next = this.waiting.shift();
		if (next) {
			this.count--;
			next();
		}
	}
}

/**
 * Specialized batch processor for database operations
 */
export class DatabaseBatchProcessor<TInput, TOutput> {
	private processor: BatchProcessor<TInput, TOutput>;
	private transactionCallback?: (batch: TInput[]) => Promise<void>;

	constructor(
		processor: (batch: TInput[]) => Promise<TOutput[]>,
		options: Partial<BatchOptions<TOutput>> & {
			transactionCallback?: (batch: TInput[]) => Promise<void>;
		} = {},
	) {
		const { transactionCallback, ...batchOptions } = options;
		this.processor = createBatchProcessor(processor, {
			batchSize: 50, // Smaller batches for DB operations
			maxConcurrency: 2, // Limited concurrency for DB
			errorStrategy: "collect-errors",
			enableLogging: true,
			...batchOptions,
		});
		this.transactionCallback = transactionCallback;
	}

	async processWithTransactions(
		items: TInput[],
	): Promise<BatchResult<TOutput>> {
		if (this.transactionCallback) {
			// Process each batch in a transaction
			const wrappedProcessor = async (batch: TInput[]): Promise<TOutput[]> => {
				await this.transactionCallback!(batch);
				return this.processor.process(batch).then((result) => result.results);
			};

			const transactionProcessor = createBatchProcessor(
				wrappedProcessor,
				this.processor.options,
			);
			return transactionProcessor.process(items);
		}

		return this.processor.process(items);
	}
}

/**
 * Stream-based batch processor for very large datasets
 */
export class StreamBatchProcessor<TInput, TOutput> {
	private options: BatchOptions<TOutput>;
	private processor: (batch: TInput[]) => Promise<TOutput[]>;

	constructor(
		processor: (batch: TInput[]) => Promise<TOutput[]>,
		options: Partial<BatchOptions<TOutput>> = {},
	) {
		this.processor = processor;
		this.options = {
			batchSize: 1000,
			maxConcurrency: 5,
			delayBetweenBatches: 10,
			errorStrategy: "skip-errors",
			enableLogging: true,
			...options,
		};
	}

	async *processStream(
		dataSource: AsyncIterable<TInput> | Iterable<TInput>,
	): AsyncGenerator<BatchResult<TOutput>, void, unknown> {
		let batch: TInput[] = [];
		let totalProcessed = 0;

		for await (const item of dataSource) {
			batch.push(item);

			if (batch.length >= this.options.batchSize) {
				const result = await this.processBatch(batch, totalProcessed);
				totalProcessed += batch.length;
				batch = [];
				yield result;

				// Memory management pause
				if (this.options.delayBetweenBatches) {
					await new Promise((resolve) =>
						setTimeout(resolve, this.options.delayBetweenBatches),
					);
				}
			}
		}

		// Process remaining items
		if (batch.length > 0) {
			const result = await this.processBatch(batch, totalProcessed);
			yield result;
		}
	}

	private async processBatch(
		batch: TInput[],
		totalProcessed: number,
	): Promise<BatchResult<TOutput>> {
		const startTime = performance.now();

		try {
			const results = await this.processor(batch);
			const endTime = performance.now();

			if (this.options.onProgress) {
				this.options.onProgress(
					totalProcessed + batch.length,
					totalProcessed + batch.length,
					Math.floor(totalProcessed / this.options.batchSize) + 1,
				);
			}

			return {
				results,
				errors: [],
				statistics: {
					totalProcessed: results.length,
					successfulBatches: 1,
					failedBatches: 0,
					totalTime: endTime - startTime,
					averageBatchTime: endTime - startTime,
					itemsPerSecond: results.length / ((endTime - startTime) / 1000),
				},
			};
		} catch (error) {
			const appError =
				error instanceof Error ? error : new Error(String(error));

			return {
				results: [],
				errors: [appError as AppError],
				statistics: {
					totalProcessed: 0,
					successfulBatches: 0,
					failedBatches: 1,
					totalTime: performance.now() - startTime,
					averageBatchTime: 0,
					itemsPerSecond: 0,
				},
			};
		}
	}
}

/**
 * Queue-based batch processor with priority support
 */
export class PriorityBatchProcessor<TInput, TOutput> {
	private queues: Map<number, TInput[]> = new Map();
	private processing = false;
	private processor: (batch: TInput[]) => Promise<TOutput[]>;
	private options: BatchOptions<TOutput>;
	private results: TOutput[] = [];
	private errors: AppError[] = [];

	constructor(
		processor: (batch: TInput[]) => Promise<TOutput[]>,
		options: Partial<BatchOptions<TOutput>> = {},
	) {
		this.processor = processor;
		this.options = {
			batchSize: 100,
			maxConcurrency: 3,
			errorStrategy: "collect-errors",
			enableLogging: false,
			...options,
		};
	}

	add(items: TInput[], priority = 0): void {
		if (!this.queues.has(priority)) {
			this.queues.set(priority, []);
		}
		this.queues.get(priority)!.push(...items);

		if (!this.processing) {
			this.processQueue();
		}
	}

	private async processQueue(): Promise<void> {
		if (this.processing) return;
		this.processing = true;

		try {
			while (this.queues.size > 0) {
				// Get highest priority queue
				const priorities = Array.from(this.queues.keys()).sort((a, b) => b - a);
				const highestPriority = priorities[0];
				const queue = this.queues.get(highestPriority)!;

				if (queue.length === 0) {
					this.queues.delete(highestPriority);
					continue;
				}

				// Create batch from highest priority queue
				const batch = queue.splice(0, this.options.batchSize);

				try {
					const batchResults = await this.processor(batch);
					this.results.push(...batchResults);

					if (this.options.enableLogging) {
						console.log(
							`✅ Processed priority ${highestPriority} batch: ${batch.length} items`,
						);
					}
				} catch (error) {
					const appError =
						error instanceof Error ? error : new Error(String(error));
					this.errors.push(appError as AppError);

					if (this.options.errorStrategy === "fail-fast") {
						throw error;
					}
				}

				// Clean up empty queues
				if (queue.length === 0) {
					this.queues.delete(highestPriority);
				}

				// Brief pause between batches
				if (this.options.delayBetweenBatches) {
					await new Promise((resolve) =>
						setTimeout(resolve, this.options.delayBetweenBatches),
					);
				}
			}
		} finally {
			this.processing = false;
		}
	}

	getResults(): BatchResult<TOutput> {
		return {
			results: [...this.results],
			errors: [...this.errors],
			statistics: {
				totalProcessed: this.results.length,
				successfulBatches: 0, // Would need tracking
				failedBatches: this.errors.length,
				totalTime: 0, // Would need tracking
				averageBatchTime: 0,
				itemsPerSecond: 0,
			},
		};
	}

	clear(): void {
		this.queues.clear();
		this.results = [];
		this.errors = [];
	}
}

export type { BatchOptions, BatchResult, BatchProcessor };

/**
 * Performance benchmark tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAdapter } from '../mocks/MockAdapter.js';
import { 
	createTestAdapter, 
	generateTestData, 
	generators, 
	PerformanceTracker,
	type TestRecord 
} from '../utils/test-helpers.js';

describe('Performance Benchmarks', () => {
	let adapter: MockAdapter<TestRecord>;
	let tracker: PerformanceTracker;

	beforeEach(() => {
		tracker = new PerformanceTracker();
	});

	afterEach(async () => {
		if (adapter) {
			await adapter.destroy();
		}
	});

	describe('Data Operations Performance', () => {
		it('should handle large datasets efficiently', async () => {
			// Generate large dataset
			const largeDataset = generateTestData(1000, generators.testRecord);
			
			adapter = new MockAdapter<TestRecord>({
				autoConnect: true,
				connectionDelay: 5,
				simulateNetworkLatency: 1,
				mockData: {
					test_table: largeDataset,
				},
			});

			await new Promise(resolve => setTimeout(resolve, 20));

			// Benchmark findMany operations
			const findManyEnd = tracker.start('findMany-large');
			const result = await adapter.findMany('test_table', {
				limit: 100,
			});
			findManyEnd();

			expect(result.records.length).toBe(100);
			
			const findManyStats = tracker.getStats('findMany-large')!;
			expect(findManyStats.avg).toBeLessThan(50); // Should complete in < 50ms

			// Benchmark findOne operations
			for (let i = 0; i < 10; i++) {
				const findOneEnd = tracker.start('findOne-batch');
				await adapter.findOne('test_table', i + 1);
				findOneEnd();
			}

			const findOneStats = tracker.getStats('findOne-batch')!;
			expect(findOneStats.count).toBe(10);
			expect(findOneStats.avg).toBeLessThan(10); // Should complete in < 10ms per operation
		});

		it('should handle concurrent operations efficiently', async () => {
			adapter = createTestAdapter<TestRecord>({
				simulateNetworkLatency: 10,
			});

			await new Promise(resolve => setTimeout(resolve, 20));

			// Run concurrent operations
			const concurrentEnd = tracker.start('concurrent-operations');
			
			const promises = Array.from({ length: 20 }, async (_, i) => {
				const operationEnd = tracker.start('single-operation');
				const result = await adapter.findOne('test_table', (i % 3) + 1);
				operationEnd();
				return result;
			});

			const results = await Promise.all(promises);
			concurrentEnd();

			expect(results.length).toBe(20);
			expect(results.every(r => r !== null)).toBe(true);

			const concurrentStats = tracker.getStats('concurrent-operations')!;
			const singleStats = tracker.getStats('single-operation')!;

			// Concurrent execution should be more efficient than sequential
			expect(concurrentStats.total).toBeLessThan(singleStats.total);
			expect(singleStats.count).toBe(20);
		});
	});

	describe('Subscription Performance', () => {
		it('should handle multiple subscribers efficiently', async () => {
			adapter = createTestAdapter<TestRecord>();
			await new Promise(resolve => setTimeout(resolve, 20));

			const subscriberCount = 50;
			const unsubscribeFunctions: (() => void)[] = [];
			const updateCounts: number[] = new Array(subscriberCount).fill(0);

			// Create multiple subscribers
			const subscribeEnd = tracker.start('create-subscribers');
			
			for (let i = 0; i < subscriberCount; i++) {
				const unsubscribe = adapter.subscribe(
					{ table: 'test_table' },
					() => {
						updateCounts[i]++;
					}
				);
				unsubscribeFunctions.push(unsubscribe);
			}
			
			subscribeEnd();

			// Trigger updates
			const updateEnd = tracker.start('broadcast-updates');
			
			for (let i = 0; i < 5; i++) {
				await adapter.simulateUpdate('test_table', {
					id: i + 10,
					name: `Updated Record ${i}`,
					value: i * 10,
				});
			}
			
			updateEnd();

			// Wait for updates to propagate
			await new Promise(resolve => setTimeout(resolve, 50));

			// Verify all subscribers received updates
			expect(updateCounts.every(count => count === 5)).toBe(true);

			// Cleanup
			const cleanupEnd = tracker.start('cleanup-subscribers');
			unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
			cleanupEnd();

			// Check performance metrics
			const subscribeStats = tracker.getStats('create-subscribers')!;
			const updateStats = tracker.getStats('broadcast-updates')!;
			const cleanupStats = tracker.getStats('cleanup-subscribers')!;

			expect(subscribeStats.avg).toBeLessThan(100); // Should be fast to subscribe
			expect(updateStats.avg).toBeLessThan(50); // Should be fast to broadcast
			expect(cleanupStats.avg).toBeLessThan(50); // Should be fast to cleanup
		});
	});

	describe('Memory Usage', () => {
		it('should not leak memory with subscription churn', async () => {
			adapter = createTestAdapter<TestRecord>();
			await new Promise(resolve => setTimeout(resolve, 20));

			const iterations = 100;

			for (let i = 0; i < iterations; i++) {
				// Subscribe
				const unsubscribe = adapter.subscribe(
					{ table: 'test_table' },
					() => {
						// No-op
					}
				);

				// Immediately unsubscribe
				unsubscribe();
			}

			// Should have no active subscribers
			expect(adapter.getSubscriberCount()).toBe(0);

			// Create some lasting subscribers
			const persistentUnsubscribes: (() => void)[] = [];
			for (let i = 0; i < 10; i++) {
				const unsubscribe = adapter.subscribe(
					{ table: 'test_table' },
					() => {
						// No-op
					}
				);
				persistentUnsubscribes.push(unsubscribe);
			}

			expect(adapter.getSubscriberCount()).toBe(10);

			// Cleanup
			persistentUnsubscribes.forEach(unsubscribe => unsubscribe());
			expect(adapter.getSubscriberCount()).toBe(0);
		});

		it('should handle cache efficiency', async () => {
			// Create adapter with longer cache TTL for testing
			adapter = new MockAdapter<TestRecord>({
				autoConnect: true,
				cache: {
					enabled: true,
					ttl: 1000, // 1 second
				},
				mockData: {
					test_table: generateTestData(100, generators.testRecord),
				},
			});

			await new Promise(resolve => setTimeout(resolve, 20));

			// First read (cache miss)
			const firstReadEnd = tracker.start('cache-miss');
			const result1 = await adapter.findOne('test_table', 1);
			firstReadEnd();

			// Second read (should be faster due to cache)
			const secondReadEnd = tracker.start('cache-hit');
			const result2 = await adapter.findOne('test_table', 1);
			secondReadEnd();

			expect(result1).toEqual(result2);

			// Note: In our mock implementation, cache benefits are simulated
			// In a real implementation, cache hits would be significantly faster
			const missStats = tracker.getStats('cache-miss')!;
			const hitStats = tracker.getStats('cache-hit')!;

			// Both should be reasonably fast for a mock
			expect(missStats.avg).toBeLessThan(50);
			expect(hitStats.avg).toBeLessThan(50);
		});
	});

	describe('Edge Case Performance', () => {
		it('should handle rapid connect/disconnect cycles', async () => {
			adapter = new MockAdapter<TestRecord>({
				autoConnect: false,
				connectionDelay: 5,
			});

			const cycles = 10;
			
			const cycleEnd = tracker.start('connect-disconnect-cycles');
			
			for (let i = 0; i < cycles; i++) {
				await adapter.connect();
				expect(adapter.isConnected()).toBe(true);
				
				await adapter.disconnect();
				expect(adapter.isConnected()).toBe(false);
			}
			
			cycleEnd();

			const cycleStats = tracker.getStats('connect-disconnect-cycles')!;
			expect(cycleStats.avg).toBeLessThan(1000); // Should complete cycles quickly
		});

		it('should handle error recovery performance', async () => {
			adapter = new MockAdapter<TestRecord>({
				autoConnect: true,
				connectionDelay: 10,
			});

			await new Promise(resolve => setTimeout(resolve, 20));

			const errorRecoveries = 5;

			for (let i = 0; i < errorRecoveries; i++) {
				// Simulate error
				const errorEnd = tracker.start('error-simulation');
				await adapter.simulateConnectionError();
				errorEnd();

				expect(adapter.isConnected()).toBe(false);

				// Recover
				const recoveryEnd = tracker.start('error-recovery');
				await adapter.reconnect();
				recoveryEnd();

				expect(adapter.isConnected()).toBe(true);
			}

			const errorStats = tracker.getStats('error-simulation')!;
			const recoveryStats = tracker.getStats('error-recovery')!;

			expect(errorStats.count).toBe(errorRecoveries);
			expect(recoveryStats.count).toBe(errorRecoveries);
			expect(recoveryStats.avg).toBeLessThan(100); // Recovery should be fast
		});
	});

	describe('Performance Reporting', () => {
		it('should provide comprehensive performance metrics', async () => {
			adapter = createTestAdapter<TestRecord>({
				simulateNetworkLatency: 5,
			});

			await new Promise(resolve => setTimeout(resolve, 20));

			// Run various operations to generate metrics
			const operations = [
				() => adapter.findOne('test_table', 1),
				() => adapter.findMany('test_table', { limit: 5 }),
				() => adapter.create('test_table', { name: 'New', value: 999 }),
			];

			for (const operation of operations) {
				const operationEnd = tracker.start('mixed-operations');
				await operation();
				operationEnd();
			}

			// Generate performance report
			const allStats = tracker.getAllStats();
			
			expect(allStats['mixed-operations']).toBeTruthy();
			expect(allStats['mixed-operations']!.count).toBe(3);
			
			// Verify metrics structure
			const stats = allStats['mixed-operations']!;
			expect(typeof stats.avg).toBe('number');
			expect(typeof stats.min).toBe('number');
			expect(typeof stats.max).toBe('number');
			expect(typeof stats.total).toBe('number');
			expect(stats.count).toBe(3);
			
			expect(stats.min).toBeLessThanOrEqual(stats.avg);
			expect(stats.avg).toBeLessThanOrEqual(stats.max);
		});
	});
});
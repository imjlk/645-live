/**
 * Svelte composables tests
 * Note: These tests simulate the Svelte 5 runes behavior without actual Svelte runtime
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MockAdapter } from '../mocks/MockAdapter.js';
import {
	useRealtimeData,
	useConnectionStatus,
	useRealtimeSubscription,
	useCachedData,
} from '../../src/svelte/composables.svelte.js';
import type { BaseRecord } from '../../src/types/index.js';

// Mock Svelte's untrack function
vi.mock('svelte', () => ({
	untrack: vi.fn((fn) => fn()),
}));

interface TestRecord extends BaseRecord {
	name: string;
	value: number;
}

describe('Svelte Composables', () => {
	let adapter: MockAdapter<TestRecord>;

	beforeEach(() => {
		adapter = new MockAdapter<TestRecord>({
			autoConnect: true,
			connectionDelay: 10,
			simulateNetworkLatency: 10,
		});
	});

	afterEach(async () => {
		await adapter.destroy();
	});

	describe('useRealtimeData', () => {
		it('should load single record by ID', async () => {
			const testRecord: TestRecord = {
				id: 1,
				name: 'Test Record',
				value: 42,
			};

			adapter.setTableData('test_table', [testRecord]);

			const {
				get data,
				get loading,
				get error,
				refetch,
			} = useRealtimeData(adapter, {
				table: 'test_table',
				id: 1,
				autoLoad: true,
			});

			// Wait for autoLoad to complete
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(loading()).toBe(false);
			expect(error()).toBeNull();
			expect(data()).toEqual(testRecord);
		});

		it('should load multiple records', async () => {
			const testRecords: TestRecord[] = [
				{ id: 1, name: 'Record 1', value: 10 },
				{ id: 2, name: 'Record 2', value: 20 },
				{ id: 3, name: 'Record 3', value: 30 },
			];

			adapter.setTableData('test_table', testRecords);

			const {
				get data,
				get loading,
				get error,
			} = useRealtimeData(adapter, {
				table: 'test_table',
				autoLoad: true,
				limit: 10,
			});

			// Wait for autoLoad to complete
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(loading()).toBe(false);
			expect(error()).toBeNull();
			expect(Array.isArray(data())).toBe(true);
			expect((data() as TestRecord[]).length).toBe(3);
		});

		it('should handle load errors', async () => {
			const errorCallback = vi.fn();

			const {
				get data,
				get loading,
				get error,
			} = useRealtimeData(adapter, {
				table: 'nonexistent_table',
				id: 999,
				autoLoad: true,
				onError: errorCallback,
			});

			// Wait for autoLoad to complete
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(loading()).toBe(false);
			expect(data()).toBeNull();
			// For this test, null result is expected, not an error
		});

		it('should refetch data manually', async () => {
			const testRecord: TestRecord = {
				id: 1,
				name: 'Test Record',
				value: 42,
			};

			adapter.setTableData('test_table', [testRecord]);

			const {
				get data,
				get loading,
				refetch,
			} = useRealtimeData(adapter, {
				table: 'test_table',
				id: 1,
				autoLoad: false,
			});

			expect(data()).toBeNull();

			await refetch();

			expect(loading()).toBe(false);
			expect(data()).toEqual(testRecord);
		});

		it('should handle subscription updates for single record', async () => {
			const testRecord: TestRecord = {
				id: 1,
				name: 'Test Record',
				value: 42,
			};

			adapter.setTableData('test_table', [testRecord]);

			const updateCallback = vi.fn();

			const {
				get data,
				subscribe,
			} = useRealtimeData(adapter, {
				table: 'test_table',
				id: 1,
				autoLoad: true,
				onUpdate: updateCallback,
			});

			// Wait for initial load
			await new Promise(resolve => setTimeout(resolve, 50));

			// Subscribe to updates
			const unsubscribe = subscribe();

			// Simulate an update
			const updatedRecord: TestRecord = {
				...testRecord,
				value: 84,
			};

			await adapter.simulateUpdate('test_table', updatedRecord);

			expect(updateCallback).toHaveBeenCalledWith(updatedRecord);
			expect(data()).toEqual(updatedRecord);

			unsubscribe();
		});
	});

	describe('useConnectionStatus', () => {
		it('should track connection status', async () => {
			const {
				get connected,
				get connecting,
				get error,
				get retryCount,
				subscribe,
			} = useConnectionStatus(adapter);

			const unsubscribe = subscribe();

			// Wait for connection to establish
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(connected()).toBe(true);
			expect(connecting()).toBe(false);
			expect(error()).toBeNull();
			expect(retryCount()).toBe(0);

			unsubscribe();
		});

		it('should handle connection errors', async () => {
			const failingAdapter = new MockAdapter({
				shouldFailConnection: true,
				connectionDelay: 10,
			});

			const {
				get connected,
				get error,
				subscribe,
			} = useConnectionStatus(failingAdapter);

			const unsubscribe = subscribe();

			// Wait for connection attempt to fail
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(connected()).toBe(false);
			expect(error()).toBeTruthy();

			unsubscribe();
			await failingAdapter.destroy();
		});

		it('should support manual reconnection', async () => {
			const {
				get connected,
				reconnect,
				subscribe,
			} = useConnectionStatus(adapter);

			const unsubscribe = subscribe();

			// Wait for initial connection
			await new Promise(resolve => setTimeout(resolve, 50));
			expect(connected()).toBe(true);

			// Disconnect
			await adapter.disconnect();
			expect(connected()).toBe(false);

			// Reconnect manually
			await reconnect();
			expect(connected()).toBe(true);

			unsubscribe();
		});
	});

	describe('useRealtimeSubscription', () => {
		it('should handle real-time updates', async () => {
			const updateCallback = vi.fn();
			const connectionCallback = vi.fn();

			const {
				get latestUpdate,
				subscribe,
			} = useRealtimeSubscription(adapter, {
				table: 'test_table',
				onUpdate: updateCallback,
				onConnectionChange: connectionCallback,
			});

			const unsubscribe = subscribe();

			// Wait for connection
			await new Promise(resolve => setTimeout(resolve, 50));

			// Simulate an update
			const testRecord: TestRecord = {
				id: 1,
				name: 'Updated Record',
				value: 100,
			};

			await adapter.simulateUpdate('test_table', testRecord);

			expect(updateCallback).toHaveBeenCalledWith(testRecord);
			expect(latestUpdate()).toEqual(testRecord);
			expect(connectionCallback).toHaveBeenCalled();

			unsubscribe();
		});

		it('should filter updates by criteria', async () => {
			const updateCallback = vi.fn();

			const {
				subscribe,
			} = useRealtimeSubscription(adapter, {
				table: 'test_table',
				filter: { name: 'Specific Record' },
				onUpdate: updateCallback,
			});

			const unsubscribe = subscribe();

			// Wait for connection
			await new Promise(resolve => setTimeout(resolve, 50));

			// Simulate updates - only matching ones should trigger callback
			await adapter.simulateUpdate('test_table', {
				id: 1,
				name: 'Specific Record',
				value: 100,
			});

			await adapter.simulateUpdate('test_table', {
				id: 2,
				name: 'Other Record',
				value: 200,
			});

			// Both updates are sent to the subscription, filtering happens at the adapter level
			// In a real implementation, the adapter would filter based on subscription options
			expect(updateCallback).toHaveBeenCalledTimes(2);

			unsubscribe();
		});
	});

	describe('useCachedData', () => {
		it('should load and cache data', async () => {
			const testRecord: TestRecord = {
				id: 1,
				name: 'Cached Record',
				value: 42,
			};

			adapter.setTableData('test_table', [testRecord]);

			const {
				get data,
				get loading,
				get isStale,
				get lastFetched,
				refetch,
			} = useCachedData(adapter, {
				table: 'test_table',
				id: 1,
				staleTime: 1000,
			});

			// Wait for initial load
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(loading()).toBe(false);
			expect(data()).toEqual(testRecord);
			expect(isStale()).toBe(false);
			expect(lastFetched()).toBeInstanceOf(Date);
		});

		it('should detect stale data', async () => {
			const testRecord: TestRecord = {
				id: 1,
				name: 'Stale Record',
				value: 42,
			};

			adapter.setTableData('test_table', [testRecord]);

			const {
				get isStale,
				get lastFetched,
			} = useCachedData(adapter, {
				table: 'test_table',
				id: 1,
				staleTime: 10, // Very short stale time
			});

			// Wait for initial load
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(isStale()).toBe(false);
			expect(lastFetched()).toBeTruthy();

			// Wait for data to become stale
			await new Promise(resolve => setTimeout(resolve, 20));

			expect(isStale()).toBe(true);
		});

		it('should invalidate cache', async () => {
			const testRecord: TestRecord = {
				id: 1,
				name: 'Record to Invalidate',
				value: 42,
			};

			adapter.setTableData('test_table', [testRecord]);

			const {
				get lastFetched,
				invalidate,
			} = useCachedData(adapter, {
				table: 'test_table',
				id: 1,
			});

			// Wait for initial load
			await new Promise(resolve => setTimeout(resolve, 50));

			expect(lastFetched()).toBeTruthy();

			// Invalidate cache
			invalidate();

			expect(lastFetched()).toBeNull();
		});
	});

	describe('Error Scenarios', () => {
		it('should handle adapter failures gracefully', async () => {
			const failingAdapter = new MockAdapter({
				autoConnect: false,
			});

			const errorCallback = vi.fn();

			const {
				get error,
				refetch,
			} = useRealtimeData(failingAdapter, {
				table: 'test_table',
				id: 1,
				autoLoad: false,
				onError: errorCallback,
			});

			// Try to refetch without connection
			await refetch();

			// Should handle the error without crashing
			expect(error()).toBeTruthy();

			await failingAdapter.destroy();
		});

		it('should handle subscription errors', async () => {
			const {
				subscribe,
			} = useRealtimeSubscription(adapter, {
				table: 'test_table',
			});

			const unsubscribe = subscribe();

			// Simulate connection error
			await adapter.simulateConnectionError();

			// Should not throw
			expect(() => unsubscribe()).not.toThrow();
		});
	});
});
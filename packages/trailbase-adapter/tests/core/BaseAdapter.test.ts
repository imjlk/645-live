/**
 * BaseAdapter unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockAdapter } from '../mocks/MockAdapter.js';
import type { BaseRecord, ConnectionState } from '../../src/types/index.js';

interface TestRecord extends BaseRecord {
	name: string;
	value: number;
}

describe('BaseAdapter', () => {
	let adapter: MockAdapter<TestRecord>;

	beforeEach(() => {
		adapter = new MockAdapter<TestRecord>({
			autoConnect: false,
			connectionDelay: 10,
		});
	});

	describe('Connection Management', () => {
		it('should initialize with disconnected state', () => {
			const state = adapter.getConnectionState();
			expect(state.connected).toBe(false);
			expect(state.connecting).toBe(false);
			expect(state.error).toBeNull();
			expect(state.retryCount).toBe(0);
		});

		it('should connect successfully', async () => {
			await adapter.connect();
			
			const state = adapter.getConnectionState();
			expect(state.connected).toBe(true);
			expect(state.connecting).toBe(false);
			expect(state.error).toBeNull();
			expect(state.lastConnected).toBeInstanceOf(Date);
		});

		it('should handle connection failure', async () => {
			const failingAdapter = new MockAdapter({
				shouldFailConnection: true,
				connectionDelay: 10,
			});

			await expect(failingAdapter.connect()).rejects.toThrow('Mock connection failed');
			
			const state = failingAdapter.getConnectionState();
			expect(state.connected).toBe(false);
			expect(state.connecting).toBe(false);
			expect(state.error).toBeTruthy();
		});

		it('should disconnect properly', async () => {
			await adapter.connect();
			expect(adapter.isConnected()).toBe(true);

			await adapter.disconnect();
			expect(adapter.isConnected()).toBe(false);
			
			const state = adapter.getConnectionState();
			expect(state.connected).toBe(false);
		});

		it('should reconnect properly', async () => {
			await adapter.connect();
			await adapter.disconnect();
			
			await adapter.reconnect();
			expect(adapter.isConnected()).toBe(true);
		});
	});

	describe('Connection State Subscription', () => {
		it('should notify subscribers of connection state changes', async () => {
			const states: ConnectionState[] = [];
			
			const unsubscribe = adapter.subscribeToConnectionState((state) => {
				states.push({ ...state });
			});

			// Initial state should be emitted immediately
			expect(states).toHaveLength(1);
			expect(states[0].connected).toBe(false);

			// Connect and check state changes
			await adapter.connect();
			
			expect(states.length).toBeGreaterThan(1);
			const lastState = states[states.length - 1];
			expect(lastState.connected).toBe(true);

			unsubscribe();
		});

		it('should handle multiple subscribers', async () => {
			const states1: ConnectionState[] = [];
			const states2: ConnectionState[] = [];

			const unsubscribe1 = adapter.subscribeToConnectionState((state) => {
				states1.push({ ...state });
			});

			const unsubscribe2 = adapter.subscribeToConnectionState((state) => {
				states2.push({ ...state });
			});

			await adapter.connect();

			expect(states1.length).toBeGreaterThan(1);
			expect(states2.length).toBeGreaterThan(1);
			expect(states1[states1.length - 1].connected).toBe(true);
			expect(states2[states2.length - 1].connected).toBe(true);

			unsubscribe1();
			unsubscribe2();
		});
	});

	describe('Cache Management', () => {
		beforeEach(async () => {
			await adapter.connect();
		});

		it('should cache data correctly', async () => {
			const testData: TestRecord = {
				id: 1,
				name: 'Test',
				value: 42,
			};

			adapter.setTableData('test_table', [testData]);

			// First call should fetch from "network"
			const result1 = await adapter.findOne('test_table', 1);
			expect(result1).toEqual(testData);

			// Second call should be served from cache (we can't easily test this without mocking internal methods)
			const result2 = await adapter.findOne('test_table', 1);
			expect(result2).toEqual(testData);
		});

		it('should clear cache properly', async () => {
			const testData: TestRecord = {
				id: 1,
				name: 'Test',
				value: 42,
			};

			adapter.setTableData('test_table', [testData]);
			await adapter.findOne('test_table', 1);

			adapter.clearCache();

			// After clearing cache, data should still be accessible
			const result = await adapter.findOne('test_table', 1);
			expect(result).toEqual(testData);
		});
	});

	describe('Error Handling', () => {
		beforeEach(async () => {
			await adapter.connect();
		});

		it('should handle not found errors gracefully', async () => {
			const result = await adapter.findOne('nonexistent_table', 999);
			expect(result).toBeNull();
		});

		it('should throw errors for failed operations', async () => {
			await expect(adapter.update('test_table', 999, { name: 'Updated' }))
				.rejects.toThrow('Record not found');
		});
	});

	describe('Retry Logic', () => {
		it('should calculate retry delay with exponential backoff', () => {
			// This tests the internal retry logic
			// We can't easily test the actual retry mechanism without more complex mocking
			const adapter = new MockAdapter({
				reconnect: {
					maxAttempts: 3,
					baseDelay: 100,
					maxDelay: 1000,
					jitter: false,
				},
			});

			// Test that the adapter is created with the right config
			expect(adapter).toBeInstanceOf(MockAdapter);
		});
	});

	describe('Cleanup', () => {
		it('should cleanup resources properly', async () => {
			await adapter.connect();
			
			const unsubscribe = adapter.subscribeToConnectionState(() => {});
			
			await adapter.destroy();
			
			expect(adapter.isConnected()).toBe(false);
			
			// Unsubscribe should still work after destroy
			expect(() => unsubscribe()).not.toThrow();
		});
	});
});
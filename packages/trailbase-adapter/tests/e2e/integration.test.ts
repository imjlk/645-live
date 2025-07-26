/**
 * End-to-End integration tests
 * Tests the complete flow from adapter creation to data operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAdapter, getAdapter, resetAdapter } from '../../src/adapters/index.js';
import { MockAdapter } from '../mocks/MockAdapter.js';
import {
	useRealtimeData,
	useConnectionStatus,
} from '../../src/svelte/composables.svelte.js';
import type { BaseRecord } from '../../src/types/index.js';

interface LottoDrawScanCount extends BaseRecord {
	round: number;
	scan_count_1: number;
	scan_count_2: number;
	scan_count_3: number;
	total_scans: number;
	updated_at: string;
}

describe('E2E Integration Tests', () => {
	let adapter: MockAdapter<LottoDrawScanCount>;

	beforeEach(() => {
		resetAdapter();
		
		// Create mock adapter with sample data
		adapter = new MockAdapter<LottoDrawScanCount>({
			autoConnect: true,
			connectionDelay: 10,
			simulateNetworkLatency: 5,
			mockData: {
				lotto_draw_scan_counts: [
					{
						id: 1234,
						round: 1234,
						scan_count_1: 42,
						scan_count_2: 38,
						scan_count_3: 45,
						total_scans: 1000,
						updated_at: '2023-01-01T00:00:00Z',
					},
					{
						id: 1235,
						round: 1235,
						scan_count_1: 55,
						scan_count_2: 41,
						scan_count_3: 39,
						total_scans: 1100,
						updated_at: '2023-01-02T00:00:00Z',
					},
				],
			},
		});
	});

	afterEach(async () => {
		await adapter.destroy();
		resetAdapter();
	});

	describe('Complete Data Flow', () => {
		it('should handle full CRUD operations', async () => {
			// Wait for connection
			await new Promise(resolve => setTimeout(resolve, 50));

			// 1. Read existing data
			const existingRecord = await adapter.findOne('lotto_draw_scan_counts', 1234);
			expect(existingRecord).toBeTruthy();
			expect(existingRecord!.round).toBe(1234);

			// 2. Create new record
			const newRecord = await adapter.create('lotto_draw_scan_counts', {
				round: 1236,
				scan_count_1: 60,
				scan_count_2: 45,
				scan_count_3: 42,
				total_scans: 1200,
				updated_at: new Date().toISOString(),
			});

			expect(newRecord.round).toBe(1236);
			expect(newRecord.id).toBeTruthy();

			// 3. Update the record
			const updatedRecord = await adapter.update(
				'lotto_draw_scan_counts',
				newRecord.id!,
				{ scan_count_1: 65 }
			);

			expect(updatedRecord.scan_count_1).toBe(65);
			expect(updatedRecord.round).toBe(1236);

			// 4. List records to verify changes
			const allRecords = await adapter.findMany('lotto_draw_scan_counts', {
				order: ['-round'],
			});

			expect(allRecords.records.length).toBe(3);
			expect(allRecords.records[0].round).toBe(1236);

			// 5. Delete the record
			await adapter.delete('lotto_draw_scan_counts', newRecord.id!);

			// 6. Verify deletion
			const deletedRecord = await adapter.findOne('lotto_draw_scan_counts', newRecord.id!);
			expect(deletedRecord).toBeNull();
		});

		it('should handle real-time updates with composables', async () => {
			// Set up connection status monitoring
			const connectionStatus = useConnectionStatus(adapter);
			const connectionUnsubscribe = connectionStatus.subscribe();

			// Set up data monitoring
			const realtimeData = useRealtimeData(adapter, {
				table: 'lotto_draw_scan_counts',
				id: 1234,
				autoLoad: true,
			});

			const dataUnsubscribe = realtimeData.subscribe();

			// Wait for initial load and connection
			await new Promise(resolve => setTimeout(resolve, 100));

			// Verify initial state
			expect(connectionStatus.connected()).toBe(true);
			expect(realtimeData.data()).toBeTruthy();
			expect((realtimeData.data() as LottoDrawScanCount).round).toBe(1234);

			// Simulate real-time update
			const updatedRecord: LottoDrawScanCount = {
				id: 1234,
				round: 1234,
				scan_count_1: 100, // Changed value
				scan_count_2: 38,
				scan_count_3: 45,
				total_scans: 1050,
				updated_at: new Date().toISOString(),
			};

			await adapter.simulateUpdate('lotto_draw_scan_counts', updatedRecord);

			// Wait for update to propagate
			await new Promise(resolve => setTimeout(resolve, 50));

			// Verify the update was received
			const currentData = realtimeData.data() as LottoDrawScanCount;
			expect(currentData.scan_count_1).toBe(100);
			expect(currentData.total_scans).toBe(1050);

			// Cleanup
			connectionUnsubscribe();
			dataUnsubscribe();
		});

		it('should handle connection failures and recovery', async () => {
			const connectionStatus = useConnectionStatus(adapter);
			const unsubscribe = connectionStatus.subscribe();

			// Wait for initial connection
			await new Promise(resolve => setTimeout(resolve, 50));
			expect(connectionStatus.connected()).toBe(true);

			// Simulate connection error
			await adapter.simulateConnectionError();

			// Verify error state
			expect(connectionStatus.connected()).toBe(false);
			expect(connectionStatus.error()).toBeTruthy();

			// Reconnect
			await connectionStatus.reconnect();

			// Verify recovery
			expect(connectionStatus.connected()).toBe(true);
			expect(connectionStatus.error()).toBeNull();

			unsubscribe();
		});
	});

	describe('Error Handling Scenarios', () => {
		it('should handle 404 errors gracefully', async () => {
			await new Promise(resolve => setTimeout(resolve, 50));

			// Try to fetch non-existent record
			const result = await adapter.findOne('lotto_draw_scan_counts', 99999);
			expect(result).toBeNull();

			// Try to update non-existent record
			await expect(
				adapter.update('lotto_draw_scan_counts', 99999, { scan_count_1: 100 })
			).rejects.toThrow('Record not found');

			// Try to delete non-existent record
			await expect(
				adapter.delete('lotto_draw_scan_counts', 99999)
			).rejects.toThrow('Record not found');
		});

		it('should handle network latency gracefully', async () => {
			// Create adapter with higher latency
			const slowAdapter = new MockAdapter<LottoDrawScanCount>({
				autoConnect: true,
				connectionDelay: 100,
				simulateNetworkLatency: 100,
				mockData: {
					lotto_draw_scan_counts: [
						{
							id: 1,
							round: 1,
							scan_count_1: 10,
							scan_count_2: 20,
							scan_count_3: 30,
							total_scans: 100,
							updated_at: '2023-01-01T00:00:00Z',
						},
					],
				},
			});

			const startTime = Date.now();
			const result = await slowAdapter.findOne('lotto_draw_scan_counts', 1);
			const endTime = Date.now();

			expect(result).toBeTruthy();
			expect(endTime - startTime).toBeGreaterThan(100); // Should account for simulated latency

			await slowAdapter.destroy();
		});
	});

	describe('Performance Scenarios', () => {
		it('should handle multiple concurrent operations', async () => {
			await new Promise(resolve => setTimeout(resolve, 50));

			const promises = Array.from({ length: 10 }, (_, i) =>
				adapter.findOne('lotto_draw_scan_counts', 1234 + (i % 2))
			);

			const results = await Promise.all(promises);

			// All requests should succeed
			results.forEach(result => {
				expect(result).toBeTruthy();
				expect([1234, 1235]).toContain(result!.round);
			});
		});

		it('should handle subscription cleanup properly', async () => {
			const subscriptions: (() => void)[] = [];

			// Create multiple subscriptions
			for (let i = 0; i < 5; i++) {
				const unsubscribe = adapter.subscribe(
					{ table: 'lotto_draw_scan_counts' },
					() => {
						// No-op callback
					}
				);
				subscriptions.push(unsubscribe);
			}

			expect(adapter.getSubscriberCount()).toBe(5);

			// Cleanup subscriptions
			subscriptions.forEach(unsubscribe => unsubscribe());

			expect(adapter.getSubscriberCount()).toBe(0);
		});
	});

	describe('Data Consistency', () => {
		it('should maintain data consistency across operations', async () => {
			await new Promise(resolve => setTimeout(resolve, 50));

			// Get initial count
			const initialList = await adapter.findMany('lotto_draw_scan_counts');
			const initialCount = initialList.records.length;

			// Create a record
			const newRecord = await adapter.create('lotto_draw_scan_counts', {
				round: 9999,
				scan_count_1: 1,
				scan_count_2: 2,
				scan_count_3: 3,
				total_scans: 6,
				updated_at: new Date().toISOString(),
			});

			// Verify count increased
			const afterCreateList = await adapter.findMany('lotto_draw_scan_counts');
			expect(afterCreateList.records.length).toBe(initialCount + 1);

			// Update the record
			await adapter.update('lotto_draw_scan_counts', newRecord.id!, {
				scan_count_1: 10,
			});

			// Verify the update
			const updatedRecord = await adapter.findOne('lotto_draw_scan_counts', newRecord.id!);
			expect(updatedRecord!.scan_count_1).toBe(10);

			// Delete the record
			await adapter.delete('lotto_draw_scan_counts', newRecord.id!);

			// Verify count returned to initial
			const finalList = await adapter.findMany('lotto_draw_scan_counts');
			expect(finalList.records.length).toBe(initialCount);
		});

		it('should handle filtering and sorting correctly', async () => {
			await new Promise(resolve => setTimeout(resolve, 50));

			// Test ordering
			const orderedResults = await adapter.findMany('lotto_draw_scan_counts', {
				order: ['-round'],
			});

			expect(orderedResults.records[0].round).toBeGreaterThan(
				orderedResults.records[1].round
			);

			// Test pagination
			const paginatedResults = await adapter.findMany('lotto_draw_scan_counts', {
				limit: 1,
				offset: 0,
			});

			expect(paginatedResults.records.length).toBe(1);
			expect(paginatedResults.has_more).toBe(true);
		});
	});
});
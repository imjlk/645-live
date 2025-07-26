/**
 * Test utilities and helpers
 */

import { MockAdapter } from '../mocks/MockAdapter.js';
import type { BaseRecord } from '../../src/types/index.js';

export interface TestRecord extends BaseRecord {
	name: string;
	value: number;
	category?: string;
}

export interface LottoTestRecord extends BaseRecord {
	round: number;
	scan_count_1: number;
	scan_count_2: number;
	scan_count_3: number;
	total_scans: number;
	updated_at: string;
}

/**
 * Creates a mock adapter with sample data for testing
 */
export function createTestAdapter<T extends BaseRecord = TestRecord>(
	options: {
		autoConnect?: boolean;
		connectionDelay?: number;
		simulateNetworkLatency?: number;
		mockData?: Record<string, T[]>;
	} = {}
): MockAdapter<T> {
	const defaultData = {
		test_table: [
			{
				id: 1,
				name: 'Test Record 1',
				value: 10,
				category: 'A',
			},
			{
				id: 2,
				name: 'Test Record 2',
				value: 20,
				category: 'B',
			},
			{
				id: 3,
				name: 'Test Record 3',
				value: 30,
				category: 'A',
			},
		] as T[],
	};

	return new MockAdapter<T>({
		autoConnect: options.autoConnect ?? true,
		connectionDelay: options.connectionDelay ?? 10,
		simulateNetworkLatency: options.simulateNetworkLatency ?? 5,
		mockData: options.mockData ?? defaultData,
	});
}

/**
 * Creates a mock adapter with lotto-specific test data
 */
export function createLottoTestAdapter(
	options: {
		autoConnect?: boolean;
		connectionDelay?: number;
		simulateNetworkLatency?: number;
		rounds?: number[];
	} = {}
): MockAdapter<LottoTestRecord> {
	const { rounds = [1234, 1235, 1236] } = options;

	const mockData = {
		lotto_draw_scan_counts: rounds.map((round, index) => ({
			id: round,
			round,
			scan_count_1: 40 + index * 5,
			scan_count_2: 35 + index * 3,
			scan_count_3: 42 + index * 2,
			total_scans: 1000 + index * 100,
			updated_at: new Date(2023, 0, index + 1).toISOString(),
		})) as LottoTestRecord[],
	};

	return new MockAdapter<LottoTestRecord>({
		autoConnect: options.autoConnect ?? true,
		connectionDelay: options.connectionDelay ?? 10,
		simulateNetworkLatency: options.simulateNetworkLatency ?? 5,
		mockData,
	});
}

/**
 * Waits for a condition to be true or timeout
 */
export async function waitFor(
	condition: () => boolean,
	timeout = 1000,
	interval = 50
): Promise<void> {
	const startTime = Date.now();

	return new Promise((resolve, reject) => {
		const check = () => {
			if (condition()) {
				resolve();
			} else if (Date.now() - startTime >= timeout) {
				reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
			} else {
				setTimeout(check, interval);
			}
		};

		check();
	});
}

/**
 * Waits for async operations to complete
 */
export async function waitForAsync(ms = 50): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a spy function that tracks calls and allows custom implementations
 */
export function createSpy<T extends (...args: any[]) => any>(
	implementation?: T
): T & { calls: Parameters<T>[] } {
	const calls: Parameters<T>[] = [];

	const spy = ((...args: Parameters<T>) => {
		calls.push(args);
		return implementation ? implementation(...args) : undefined;
	}) as T & { calls: Parameters<T>[] };

	spy.calls = calls;
	return spy;
}

/**
 * Generates test data for performance testing
 */
export function generateTestData<T extends BaseRecord>(
	count: number,
	generator: (index: number) => Omit<T, 'id'>
): T[] {
	return Array.from({ length: count }, (_, index) => ({
		id: index + 1,
		...generator(index),
	})) as T[];
}

/**
 * Test data generators
 */
export const generators = {
	testRecord: (index: number): Omit<TestRecord, 'id'> => ({
		name: `Test Record ${index + 1}`,
		value: (index + 1) * 10,
		category: index % 2 === 0 ? 'A' : 'B',
	}),

	lottoRecord: (index: number): Omit<LottoTestRecord, 'id'> => ({
		round: 1000 + index,
		scan_count_1: 30 + (index % 20),
		scan_count_2: 25 + (index % 15),
		scan_count_3: 35 + (index % 25),
		total_scans: 800 + index * 50,
		updated_at: new Date(2023, 0, index + 1).toISOString(),
	}),
};

/**
 * Performance measurement utility
 */
export class PerformanceTracker {
	private measurements: Map<string, number[]> = new Map();

	start(label: string): () => void {
		const startTime = performance.now();

		return () => {
			const endTime = performance.now();
			const duration = endTime - startTime;

			const existing = this.measurements.get(label) || [];
			existing.push(duration);
			this.measurements.set(label, existing);
		};
	}

	getStats(label: string): {
		count: number;
		min: number;
		max: number;
		avg: number;
		total: number;
	} | null {
		const measurements = this.measurements.get(label);
		if (!measurements || measurements.length === 0) {
			return null;
		}

		const count = measurements.length;
		const total = measurements.reduce((sum, val) => sum + val, 0);
		const avg = total / count;
		const min = Math.min(...measurements);
		const max = Math.max(...measurements);

		return { count, min, max, avg, total };
	}

	clear(label?: string): void {
		if (label) {
			this.measurements.delete(label);
		} else {
			this.measurements.clear();
		}
	}

	getAllStats(): Record<string, ReturnType<PerformanceTracker['getStats']>> {
		const result: Record<string, ReturnType<PerformanceTracker['getStats']>> = {};
		
		for (const [label] of this.measurements) {
			result[label] = this.getStats(label);
		}

		return result;
	}
}

/**
 * Connection state assertion helpers
 */
export const connectionAssertions = {
	isConnected: (adapter: MockAdapter<any>) => {
		const state = adapter.getConnectionState();
		return state.connected && !state.connecting && !state.error;
	},

	isConnecting: (adapter: MockAdapter<any>) => {
		const state = adapter.getConnectionState();
		return state.connecting && !state.connected;
	},

	isDisconnected: (adapter: MockAdapter<any>) => {
		const state = adapter.getConnectionState();
		return !state.connected && !state.connecting;
	},

	hasError: (adapter: MockAdapter<any>) => {
		const state = adapter.getConnectionState();
		return !!state.error;
	},
};
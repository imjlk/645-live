/**
 * Basic usage examples for TrailBase adapter
 */

import { createAdapter, getAdapter } from '../src/index.js';
import type { BaseRecord } from '../src/types/index.js';

// Example record type
interface LottoDrawScanCount extends BaseRecord {
	round: number;
	scan_count_1: number;
	scan_count_2: number;
	// ... other scan counts
	total_scans: number;
	updated_at: string;
}

// Example 1: Create adapter directly
const adapter = createAdapter<LottoDrawScanCount>('trailbase', {
	url: 'http://localhost:4000',
	reconnect: {
		maxAttempts: 5,
		baseDelay: 1000,
		maxDelay: 30000,
	},
	cache: {
		enabled: true,
		ttl: 30000,
	},
});

// Example 2: Use singleton pattern
const singletonAdapter = getAdapter<LottoDrawScanCount>({
	url: process.env.TRAILBASE_URL || 'http://localhost:4000',
});

// Example 3: Basic operations
async function basicOperations() {
	try {
		// Connect
		await adapter.connect();

		// Find single record
		const scanData = await adapter.findOne('lotto_draw_scan_counts', 1234);
		console.log('Scan data:', scanData);

		// Find multiple records
		const latestScans = await adapter.findMany('lotto_draw_scan_counts', {
			order: ['-round'],
			limit: 10,
		});
		console.log('Latest scans:', latestScans.records);

		// Subscribe to real-time updates
		const unsubscribe = adapter.subscribe(
			{ table: 'lotto_draw_scan_counts' },
			(data) => {
				console.log('Real-time update:', data);
			},
		);

		// Monitor connection state
		const unsubscribeConnection = adapter.subscribeToConnectionState(
			(state) => {
				console.log('Connection state:', state);
			},
		);

		// Clean up subscriptions
		setTimeout(() => {
			unsubscribe();
			unsubscribeConnection();
		}, 60000);
	} catch (error) {
		console.error('Operation failed:', error);
	}
}

// Example 4: Error handling
async function withErrorHandling() {
	try {
		const data = await adapter.findOne('lotto_draw_scan_counts', 999999);
		if (!data) {
			console.log('No data found for round 999999');
		}
	} catch (error) {
		if (error.status === 404) {
			console.log('Record not found - this is expected');
		} else {
			console.error('Unexpected error:', error);
		}
	}
}

// Run examples
basicOperations();
withErrorHandling();
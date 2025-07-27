/**
 * Adapter exports and factory functions
 */

export { TrailBaseAdapter } from './TrailBaseAdapter.js';
export { TrailBaseAuthAdapter } from './AuthAdapter.js';
export { TrailBaseRecordUtilities } from './RecordUtilities.js';
export { TrailBaseCacheUtilities } from './CacheUtilities.js';
export { BaseAdapter } from '../core/BaseAdapter.js';

import { TrailBaseAdapter } from './TrailBaseAdapter.js';
import type { AdapterConfig, RealtimeAdapter, BaseRecord } from '../types/index.js';

// Adapter factory function for extensibility
export function createAdapter<T extends BaseRecord = BaseRecord>(
	type: 'trailbase',
	config: AdapterConfig,
): RealtimeAdapter<T>;
export function createAdapter<T extends BaseRecord = BaseRecord>(
	type: string,
	config: AdapterConfig,
): RealtimeAdapter<T> {
	switch (type) {
		case 'trailbase':
			return new TrailBaseAdapter<T>(config);
		default:
			throw new Error(`Unsupported adapter type: ${type}`);
	}
}

// Pre-configured singleton factory
let singletonAdapter: RealtimeAdapter | null = null;

export function getAdapter<T extends BaseRecord = BaseRecord>(
	config?: AdapterConfig,
): RealtimeAdapter<T> {
	if (!singletonAdapter) {
		if (!config) {
			throw new Error('Adapter config required for initialization');
		}
		singletonAdapter = createAdapter('trailbase', config);
	}
	return singletonAdapter as RealtimeAdapter<T>;
}

export function resetAdapter(): void {
	if (singletonAdapter) {
		singletonAdapter.destroy();
		singletonAdapter = null;
	}
}
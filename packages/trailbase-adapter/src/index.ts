/**
 * Main entry point for TrailBase adapter package
 */

// Core exports
export * from './types/index.js';
export * from './core/BaseAdapter.js';
export * from './adapters/index.js';

// Re-export commonly used items for convenience
export { TrailBaseAdapter, createAdapter, getAdapter } from './adapters/index.js';
export type {
	RealtimeAdapter,
	BaseRecord,
	ConnectionState,
	AdapterError,
	AdapterConfig,
} from './types/index.js';
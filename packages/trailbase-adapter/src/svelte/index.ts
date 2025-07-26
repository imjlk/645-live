/**
 * Svelte integration for TrailBase adapter
 */

export {
	useRealtimeData,
	useConnectionStatus,
	useRealtimeSubscription,
	useCachedData,
} from './composables.svelte.js';

// Re-export types for convenience
export type {
	BaseRecord,
	RealtimeAdapter,
	ConnectionState,
	AdapterError,
} from '../types/index.js';
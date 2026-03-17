/**
 * Svelte 5 runes-based composables for TrailBase adapter
 * Provides reactive state management with proper lifecycle handling
 */

import type {
	AdapterError,
	BaseRecord,
	ConnectionState,
	QueryOptions,
	RealtimeAdapter,
	SubscriptionOptions,
} from "../types/index.js";

interface UseRealtimeDataOptions<T extends BaseRecord = BaseRecord> {
	table: string;
	id?: string | number;
	autoLoad?: boolean;
	filter?: Record<string, unknown>;
	order?: string[];
	limit?: number;
	onError?: (error: AdapterError) => void;
	onUpdate?: (data: T) => void;
}

interface UseRealtimeDataReturn<T extends BaseRecord = BaseRecord> {
	data: T | T[] | null;
	loading: boolean;
	error: AdapterError | null;
	refetch: () => Promise<void>;
	subscribe: () => () => void;
}

/**
 * Composable for managing real-time data with reactive state
 */
export function useRealtimeData<T extends BaseRecord = BaseRecord>(
	adapter: RealtimeAdapter<T>,
	options: UseRealtimeDataOptions<T>,
): UseRealtimeDataReturn<T> {
	let data = $state<T | T[] | null>(null);
	let loading = $state(false);
	let error = $state<AdapterError | null>(null);

	const {
		table,
		id,
		autoLoad = true,
		filter,
		order,
		limit,
		onError,
		onUpdate,
	} = options;

	const refetch = async () => {
		if (loading) return;

		loading = true;
		error = null;

		try {
			if (id) {
				// Single record
				data = await adapter.findOne(table, id);
			} else {
				// Multiple records
				const queryOptions: QueryOptions = {};
				if (filter) queryOptions.filter = filter;
				if (order) queryOptions.order = order;
				if (limit) queryOptions.limit = limit;

				const result = await adapter.findMany(table, queryOptions);
				data = result.records;
			}
		} catch (err) {
			const adapterError = err as AdapterError;
			error = adapterError;
			if (onError) {
				onError(adapterError);
			}
		} finally {
			loading = false;
		}
	};

	const subscribe = (): (() => void) => {
		const subscriptionOptions: SubscriptionOptions = {
			table,
			filter,
		};

		return adapter.subscribe(subscriptionOptions, (updateData) => {
			// Filter by ID if specified
			if (id && updateData.id !== id) {
				return;
			}

			if (id) {
				// Single record update
				data = updateData;
			} else {
				// Multiple records - append or update in array
				const currentData = data as T[] | null;
				if (currentData) {
					const existingIndex = currentData.findIndex(
						(item) => item.id === updateData.id,
					);
					if (existingIndex >= 0) {
						// Update existing
						currentData[existingIndex] = updateData;
						data = [...currentData];
					} else {
						// Add new
						data = [...currentData, updateData];
					}
				} else {
					data = [updateData];
				}
			}

			if (onUpdate) {
				onUpdate(updateData);
			}
		});
	};

	// Auto-load data if requested
	if (autoLoad) {
		refetch();
	}

	return {
		get data() {
			return data;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		refetch,
		subscribe,
	};
}

interface UseConnectionStatusReturn {
	connected: boolean;
	connecting: boolean;
	error: AdapterError | null;
	lastConnected: Date | null;
	retryCount: number;
	subscribe: () => () => void;
	reconnect: () => Promise<void>;
}

/**
 * Composable for connection status monitoring
 */
export function useConnectionStatus<T extends BaseRecord = BaseRecord>(
	adapter: RealtimeAdapter<T>,
): UseConnectionStatusReturn {
	let connected = $state(false);
	let connecting = $state(false);
	let error = $state<AdapterError | null>(null);
	let lastConnected = $state<Date | null>(null);
	let retryCount = $state(0);

	const subscribe = (): (() => void) => {
		return adapter.subscribeToConnectionState((state: ConnectionState) => {
			connected = state.connected;
			connecting = state.connecting;
			error = state.error;
			lastConnected = state.lastConnected;
			retryCount = state.retryCount;
		});
	};

	const reconnect = async () => {
		await adapter.reconnect();
	};

	return {
		get connected() {
			return connected;
		},
		get connecting() {
			return connecting;
		},
		get error() {
			return error;
		},
		get lastConnected() {
			return lastConnected;
		},
		get retryCount() {
			return retryCount;
		},
		subscribe,
		reconnect,
	};
}

interface UseRealtimeSubscriptionOptions<T extends BaseRecord = BaseRecord> {
	table: string;
	filter?: Record<string, unknown>;
	onUpdate?: (data: T) => void;
	onConnectionChange?: (state: ConnectionState) => void;
}

interface UseRealtimeSubscriptionReturn<T extends BaseRecord = BaseRecord> {
	latestUpdate: T | null;
	connectionState: {
		connected: boolean;
		connecting: boolean;
		error: AdapterError | null;
		lastConnected: Date | null;
		retryCount: number;
	};
	subscribe: () => () => void;
	reconnect: () => Promise<void>;
}

/**
 * Composable for pure real-time subscriptions without initial data loading
 */
export function useRealtimeSubscription<T extends BaseRecord = BaseRecord>(
	adapter: RealtimeAdapter<T>,
	options: UseRealtimeSubscriptionOptions<T>,
): UseRealtimeSubscriptionReturn<T> {
	let latestUpdate = $state<T | null>(null);
	const connectionState = $state({
		connected: false,
		connecting: false,
		error: null as AdapterError | null,
		lastConnected: null as Date | null,
		retryCount: 0,
	});

	const { table, filter, onUpdate, onConnectionChange } = options;

	const subscribe = (): (() => void) => {
		// Subscribe to data updates
		const unsubscribeData = adapter.subscribe({ table, filter }, (data) => {
			latestUpdate = data;

			if (onUpdate) {
				onUpdate(data);
			}
		});

		// Subscribe to connection state changes
		const unsubscribeConnection = adapter.subscribeToConnectionState(
			(state) => {
				connectionState.connected = state.connected;
				connectionState.connecting = state.connecting;
				connectionState.error = state.error;
				connectionState.lastConnected = state.lastConnected;
				connectionState.retryCount = state.retryCount;

				if (onConnectionChange) {
					onConnectionChange(state);
				}
			},
		);

		return () => {
			unsubscribeData();
			unsubscribeConnection();
		};
	};

	const reconnect = async () => {
		await adapter.reconnect();
	};

	return {
		get latestUpdate() {
			return latestUpdate;
		},
		get connectionState() {
			return connectionState;
		},
		subscribe,
		reconnect,
	};
}

interface UseCachedDataOptions {
	table: string;
	id?: string | number;
	refreshInterval?: number;
	staleTime?: number;
	onError?: (error: AdapterError) => void;
}

interface UseCachedDataReturn<T extends BaseRecord = BaseRecord> {
	data: T | T[] | null;
	loading: boolean;
	error: AdapterError | null;
	isStale: boolean;
	lastFetched: Date | null;
	refetch: () => Promise<void>;
	invalidate: () => void;
}

/**
 * Composable for cached data with automatic refresh capabilities
 */
export function useCachedData<T extends BaseRecord = BaseRecord>(
	adapter: RealtimeAdapter<T>,
	options: UseCachedDataOptions,
): UseCachedDataReturn<T> {
	let data = $state<T | T[] | null>(null);
	let loading = $state(false);
	let error = $state<AdapterError | null>(null);
	let lastFetched = $state<Date | null>(null);

	const {
		table,
		id,
		refreshInterval = 30000, // 30 seconds
		staleTime = 60000, // 1 minute
		onError,
	} = options;

	let refreshTimeoutId: number | null = null;

	const refetch = async () => {
		if (loading) return;

		loading = true;
		error = null;

		try {
			if (id) {
				data = await adapter.findOne(table, id);
			} else {
				const result = await adapter.findMany(table);
				data = result.records;
			}
			lastFetched = new Date();
		} catch (err) {
			const adapterError = err as AdapterError;
			error = adapterError;
			if (onError) {
				onError(adapterError);
			}
		} finally {
			loading = false;
		}
	};

	const invalidate = () => {
		lastFetched = null;
		if (refreshTimeoutId) {
			clearTimeout(refreshTimeoutId);
			refreshTimeoutId = null;
		}
	};

	// Set up automatic refresh
	const scheduleRefresh = () => {
		if (refreshTimeoutId) {
			clearTimeout(refreshTimeoutId);
		}

		refreshTimeoutId = setTimeout(() => {
			refetch().then(() => {
				scheduleRefresh(); // Schedule next refresh
			});
		}, refreshInterval) as unknown as number;
	};

	// Start with initial fetch
	refetch().then(() => {
		scheduleRefresh();
	});

	return {
		get data() {
			return data;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get isStale() {
			if (!lastFetched) {
				return true;
			}

			return Date.now() - lastFetched.getTime() > staleTime;
		},
		get lastFetched() {
			return lastFetched;
		},
		refetch,
		invalidate,
	};
}

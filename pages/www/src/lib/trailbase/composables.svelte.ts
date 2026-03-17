/**
 * Svelte 5 runes-based composables for TrailBase client
 * Provides reactive state management with proper lifecycle handling
 */

import { untrack } from "svelte";
import { trailbaseClient } from "./client.js";
import { subscribeToGlobalConnection } from "./global-connection.svelte.js";
import type {
	ConnectionState,
	LottoDrawScanCount,
	TrailbaseError,
} from "./types.js";

interface UseScanDataOptions {
	round?: number;
	autoLoad?: boolean;
	onError?: (error: TrailbaseError) => void;
}

interface UseScanDataReturn {
	data: LottoDrawScanCount | null;
	loading: boolean;
	error: TrailbaseError | null;
	refetch: () => Promise<void>;
}

/**
 * Composable for managing scan data with reactive state
 */
export function useScanData(
	options: UseScanDataOptions = {},
): UseScanDataReturn {
	let data = $state<LottoDrawScanCount | null>(null);
	let loading = $state(false);
	let error = $state<TrailbaseError | null>(null);

	const { round, autoLoad = true, onError } = options;

	const refetch = async () => {
		if (loading) return;

		loading = true;
		error = null;

		try {
			if (round) {
				data = await trailbaseClient.getScanDataSafely(round);
			} else {
				data = await trailbaseClient.getLatestScanData();
			}
		} catch (err) {
			const trailbaseError: TrailbaseError =
				err instanceof Error
					? Object.assign(err, {
							status: (err as { status?: number }).status || 500,
						})
					: new Error("Failed to fetch scan data");

			error = trailbaseError;
			if (onError) {
				onError(trailbaseError);
			}
		} finally {
			loading = false;
		}
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
	};
}

interface UseRealtimeScanUpdatesOptions {
	onUpdate?: (data: LottoDrawScanCount) => void;
	onConnectionChange?: (state: ConnectionState) => void;
	targetRound?: number;
}

interface UseRealtimeScanUpdatesReturn {
	latestUpdate: LottoDrawScanCount | null;
	connectionState: {
		connected: boolean;
		connecting: boolean;
		error: TrailbaseError | null;
		lastConnected: Date | null;
		retryCount: number;
	};
	subscribe: () => () => void;
	reconnect: () => Promise<void>;
}

/**
 * Composable for real-time scan updates with connection state
 */
export function useRealtimeScanUpdates(
	options: UseRealtimeScanUpdatesOptions = {},
): UseRealtimeScanUpdatesReturn {
	let latestUpdate = $state<LottoDrawScanCount | null>(null);
	const connectionState = $state({
		connected: false,
		connecting: false,
		error: null as TrailbaseError | null,
		lastConnected: null as Date | null,
		retryCount: 0,
	});

	const { onUpdate, onConnectionChange, targetRound } = options;

	const subscribe = (): (() => void) => {
		const subscriberId = `composable-${Date.now()}-${Math.random()}`;

		// Subscribe to scan updates
		const unsubscribeUpdates = trailbaseClient.subscribe(
			subscriberId,
			(data) => {
				// Filter by target round if specified
				if (targetRound && data.round !== targetRound) {
					return;
				}

				latestUpdate = data;

				if (onUpdate) {
					onUpdate(data);
				}
			},
		);

		// Subscribe to connection state changes
		const unsubscribeConnection = trailbaseClient.subscribeToConnectionState(
			`${subscriberId}-connection`,
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
			unsubscribeUpdates();
			unsubscribeConnection();
		};
	};

	const reconnect = async () => {
		await trailbaseClient.reconnect();
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

interface UseBallValuesOptions {
	initialRound?: number;
	targetRound?: number; // Specific round to subscribe to (for filtering)
	// Shorter cache duration for main page (default: 30s, main page: 10s)
	cacheDuration?: number;
	onValuesChange?: (values: Record<number, number>, totalScans: number) => void;
	onBallUpdate?: (
		ballNumber: number,
		newValue: number,
		oldValue: number,
	) => void;
}

interface UseBallValuesReturn {
	ballValues: Record<number, number>;
	totalScans: number;
	currentRound: number | null;
	recentlyUpdated: Record<number, boolean>;
	loading: boolean;
	error: TrailbaseError | null;
	retryCount: number;
	lastSuccessfulLoad: Date | null;
	loadInitialData: (round?: number) => Promise<void>;
	retryConnection: () => Promise<void>;
	subscribe: () => () => void;
	setTargetRound: (round: number | null) => void;
}

/**
 * Composable specifically for managing lotto ball values and animations
 */
export function useBallValues(
	options: UseBallValuesOptions = {},
): UseBallValuesReturn {
	let ballValues = $state<Record<number, number>>({});
	let totalScans = $state(0);
	let currentRound = $state<number | null>(null);
	let recentlyUpdated = $state<Record<number, boolean>>({});
	let loading = $state(false);
	let error = $state<TrailbaseError | null>(null);
	let retryCount = $state(0);
	let lastSuccessfulLoad = $state<Date | null>(null);

	const {
		initialRound,
		onValuesChange,
		onBallUpdate,
		cacheDuration = 30000,
	} = options;
	let targetRound = $state<number | null>(options.targetRound || null);

	// Simple in-memory cache to avoid unnecessary API calls
	const dataCache = new Map<
		number,
		{ data: LottoDrawScanCount; timestamp: Date }
	>();
	const CACHE_DURATION = cacheDuration; // Use provided duration or default 30 seconds

	// Initialize ball values with zeros
	const initializeBallValues = () => {
		const values: Record<number, number> = {};
		for (let i = 1; i <= 45; i++) {
			values[i] = 0;
		}
		return values;
	};

	// Extract ball values from scan data
	const extractBallValues = (scanData: LottoDrawScanCount) => {
		const values: Record<number, number> = {};
		for (let i = 1; i <= 45; i++) {
			const scanCountField = `scan_count_${i}` as keyof LottoDrawScanCount;
			values[i] = Number(scanData[scanCountField]) || 0;
		}
		return values;
	};

	// Check cache for valid data
	const getCachedData = (round: number): LottoDrawScanCount | null => {
		const cached = dataCache.get(round);
		if (cached) {
			const age = Date.now() - cached.timestamp.getTime();
			if (age < CACHE_DURATION) {
				return cached.data;
			}
			dataCache.delete(round);
		}
		return null;
	};

	// Cache data after successful fetch
	const setCachedData = (round: number, data: LottoDrawScanCount) => {
		dataCache.set(round, { data, timestamp: new Date() });
	};

	const loadInitialData = async (round?: number, forceRefresh = false) => {
		if (loading) return;

		const roundToLoad = round || initialRound;

		// Check if we have recent successful data and don't force refresh
		if (!forceRefresh && lastSuccessfulLoad) {
			const timeSinceLastLoad = Date.now() - lastSuccessfulLoad.getTime();
			if (
				timeSinceLastLoad < CACHE_DURATION &&
				ballValues &&
				Object.keys(ballValues).length > 0
			) {
				return;
			}
		}

		// Check cache first if not forcing refresh
		if (!forceRefresh && roundToLoad) {
			const cachedData = getCachedData(roundToLoad);
			if (cachedData) {
				currentRound = cachedData.round;
				totalScans = Number(cachedData.total_scans) || 0;
				ballValues = { ...extractBallValues(cachedData) };
				lastSuccessfulLoad = new Date();
				retryCount = 0; // Reset retry count on successful cache hit

				if (onValuesChange) {
					onValuesChange(ballValues, totalScans);
				}
				return;
			}
		}

		loading = true;
		error = null;

		try {
			let scanData: LottoDrawScanCount | null = null;

			// Strategy 1: Try to get specific round data
			if (roundToLoad) {
				scanData = await trailbaseClient.getScanDataSafely(roundToLoad);

				if (scanData) {
					// Cache the successful result
					setCachedData(roundToLoad, scanData);
				} else {
					console.warn(
						`No scan data found for round ${roundToLoad}, trying latest...`,
					);
				}
			}

			// Strategy 2: If specific round fails and no specific round was requested, try latest available data
			if (!scanData && !roundToLoad) {
				scanData = await trailbaseClient.getLatestScanData();

				if (scanData) {
					// Cache the latest data
					setCachedData(scanData.round, scanData);
				} else {
					console.warn("No latest scan data found");
				}
			}

			if (scanData) {
				currentRound = scanData.round;
				totalScans = Number(scanData.total_scans) || 0;
				const newBallValues = extractBallValues(scanData);

				// Force update of ballValues to ensure reactivity
				ballValues = { ...newBallValues };
				lastSuccessfulLoad = new Date();
				retryCount = 0; // Reset retry count on success

				if (onValuesChange) {
					onValuesChange(ballValues, totalScans);
				}
			} else {
				// Initialize with zeros if no data found
				console.warn("No scan data available, initializing with zeros");
				// Keep the requested round even if no data exists
				currentRound = roundToLoad || null;
				totalScans = 0;
				ballValues = initializeBallValues();

				// Only increment retry count if no specific round was requested
				if (!roundToLoad) {
					retryCount++;
				}

				// Still call onValuesChange to notify components
				if (onValuesChange) {
					onValuesChange(ballValues, totalScans);
				}
			}
		} catch (err) {
			console.error("Failed to load initial data:", err);

			const trailbaseError: TrailbaseError =
				err instanceof Error
					? Object.assign(err, {
							status: (err as { status?: number }).status || 500,
						})
					: new Error("Failed to load initial data");

			error = trailbaseError;
			retryCount++;

			// Initialize with zeros on error
			// Keep the requested round even if there's an error
			currentRound = roundToLoad || null;
			ballValues = initializeBallValues();
			totalScans = 0;

			// Still call onValuesChange to notify components
			if (onValuesChange) {
				onValuesChange(ballValues, totalScans);
			}
		} finally {
			loading = false;
		}
	};

	const subscribe = (): (() => void) => {
		const subscriberId = `ball-values-${Date.now()}-${Math.random()}`;

		return trailbaseClient.subscribe(subscriberId, (scanData) => {
			// Filter by explicit target round first, otherwise track the current round.
			const filterRound = targetRound ?? currentRound;
			if (filterRound && scanData.round !== filterRound) {
				return;
			}

			if (targetRound) {
				currentRound = targetRound;
			} else if (scanData.round !== currentRound) {
				currentRound = scanData.round;
			}

			const newValues = extractBallValues(scanData);
			const newTotalScans = Number(scanData.total_scans) || 0;
			const previousTotalScans = totalScans;

			const updatedBalls: Record<number, boolean> = {};
			let hasChanges = false;

			for (let i = 1; i <= 45; i++) {
				const newValue = newValues[i] || 0;
				const currentValue = ballValues[i] || 0;

				if (newValue !== currentValue) {
					hasChanges = true;
					updatedBalls[i] = true;

					if (onBallUpdate) {
						onBallUpdate(i, newValue, currentValue);
					}

					// Clear animation after delay (match animation duration)
					setTimeout(() => {
						recentlyUpdated = {
							...untrack(() => recentlyUpdated),
							[i]: false,
						};
					}, 1200); // 600ms animation + 600ms visibility
				}
			}

			if (hasChanges) {
				ballValues = newValues;
				recentlyUpdated = { ...recentlyUpdated, ...updatedBalls };
			}

			if (newTotalScans !== totalScans) {
				totalScans = newTotalScans;
			}

			if (hasChanges || newTotalScans !== previousTotalScans) {
				if (onValuesChange) {
					onValuesChange(ballValues, totalScans);
				}
			}
		});
	};

	// Retry connection with exponential backoff
	const retryConnection = async () => {
		if (retryCount >= 3) {
			console.warn(`Max retry attempts (${retryCount}) reached, not retrying`);
			return;
		}

		// Try to reconnect TrailBase client first
		try {
			await trailbaseClient.reconnect();
		} catch (err) {
			console.warn("TrailBase reconnection failed:", err);
		}

		// Wait before retrying (exponential backoff)
		const delay = Math.min(1000 * 2 ** retryCount, 5000); // Max 5 seconds
		await new Promise((resolve) => setTimeout(resolve, delay));

		// Retry loading data
		await loadInitialData(currentRound || initialRound, true);
	};

	// Function to update target round (useful for dynamic filtering)
	const setTargetRound = (round: number | null) => {
		targetRound = round;
	};

	// Initialize with empty values immediately to prevent undefined state
	ballValues = initializeBallValues();

	// Auto-load initial data if round provided
	if (initialRound) {
		loadInitialData();
	}

	return {
		get ballValues() {
			return ballValues;
		},
		get totalScans() {
			return totalScans;
		},
		get currentRound() {
			return currentRound;
		},
		get recentlyUpdated() {
			return recentlyUpdated;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get retryCount() {
			return retryCount;
		},
		get lastSuccessfulLoad() {
			return lastSuccessfulLoad;
		},
		loadInitialData,
		retryConnection,
		subscribe,
		setTargetRound,
	};
}

/**
 * Simple composable for connection status display
 * Automatically subscribes on creation
 */
export function useConnectionStatus() {
	let connected = $state(false);
	let connecting = $state(false);
	let error = $state<TrailbaseError | null>(null);
	let retryCount = $state(0);
	let unsubscribeInternal: (() => void) | null = null;

	const handleStateChange = (state: ConnectionState) => {
		connected = state.connected;
		connecting = state.connecting;
		error = state.error;
		retryCount = state.retryCount;
	};

	const subscribe = (): (() => void) => {
		if (!unsubscribeInternal) {
			unsubscribeInternal = subscribeToGlobalConnection(handleStateChange);
		}

		return () => {
			unsubscribeInternal?.();
			unsubscribeInternal = null;
		};
	};

	const unsubscribe = () => {
		unsubscribeInternal?.();
		unsubscribeInternal = null;
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
		get retryCount() {
			return retryCount;
		},
		subscribe,
		unsubscribe,
	};
}

/**
 * Canonical global TrailBase connection bootstrap for browser realtime features.
 * - Holds the lotto scan subscription open for app-wide connection state
 * - Maintains active user heartbeat / disconnect lifecycle
 * - Exposes shared connection and active user state to the UI
 */

import { browser } from "$app/environment";
import {
	type ActiveUsersStats,
	activeUsersClient,
	getCurrentActiveUsersStats,
} from "./active-users-client";
import { getTrailbaseBrowserBaseUrl } from "./browser-base";
import { trailbaseClient } from "./client";
import { shouldSuppressDisconnectError } from "./stream-errors";
import type { ConnectionState } from "./types";

const GLOBAL_CONNECTION_ID = "global-connection";
const ACTIVE_USERS_SUBSCRIPTION_ID = "global-active-users";
const HEARTBEAT_INTERVAL_MS = 30_000;
const SESSION_STORAGE_KEY = "trailbase-active-session-id";

let globalConnectionState = $state<ConnectionState>({
	connected: false,
	connecting: false,
	error: null,
	lastConnected: null,
	retryCount: 0,
});

let currentActiveUsers = $state(0);
let peakActiveUsers = $state(0);

const connectionStateSubscribers = new Set<(state: ConnectionState) => void>();
const activeUsersSubscribers = new Set<(count: number, peak: number) => void>();

let isInitialized = false;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

let connectionStateUnsubscribe: (() => void) | null = null;
let activeUsersUnsubscribe: (() => void) | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let currentSessionId: string | null = null;
let unloadHandlerRegistered = false;
let autoInitialized = false;

function getTrailbaseBaseUrl(): string {
	return getTrailbaseBrowserBaseUrl();
}

function notifyConnectionStateSubscribers(): void {
	const snapshot = { ...globalConnectionState };
	for (const callback of connectionStateSubscribers.values()) {
		try {
			callback(snapshot);
		} catch (error) {
			console.error("Error in connection state subscriber:", error);
		}
	}
}

function notifyActiveUsersSubscribers(): void {
	for (const callback of activeUsersSubscribers.values()) {
		try {
			callback(currentActiveUsers, peakActiveUsers);
		} catch (error) {
			console.error("Error in active users subscriber:", error);
		}
	}
}

function applyConnectionState(state: ConnectionState): void {
	globalConnectionState = { ...state };
	notifyConnectionStateSubscribers();
}

function applyActiveUsers(stats: ActiveUsersStats): void {
	currentActiveUsers = stats.current_count;
	peakActiveUsers = Math.max(peakActiveUsers, stats.peak_count);
	notifyActiveUsersSubscribers();
}

async function refreshActiveUsers(): Promise<void> {
	const stats = await getCurrentActiveUsersStats();
	if (stats) {
		applyActiveUsers(stats);
	}
}

function ensureSessionId(): string {
	if (browser && !currentSessionId) {
		const persistedSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
		if (persistedSessionId) {
			currentSessionId = persistedSessionId;
		}
	}

	if (!currentSessionId) {
		currentSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
		if (browser) {
			sessionStorage.setItem(SESSION_STORAGE_KEY, currentSessionId);
		}
	}
	return currentSessionId;
}

async function sendHeartbeat(): Promise<void> {
	const sessionId = ensureSessionId();

	const response = await fetch(
		`${getTrailbaseBaseUrl()}/connection/heartbeat`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				session_id: sessionId,
				user_agent: navigator.userAgent,
				page_path: window.location.pathname,
			}),
		},
	);

	if (!response.ok) {
		throw new Error(
			`Heartbeat failed: ${response.status} ${response.statusText}`,
		);
	}

	const result = (await response.json()) as {
		success?: boolean;
		active_count?: number;
		error?: string;
	};

	if (!result.success) {
		throw new Error(result.error || "Heartbeat failed");
	}

	if (typeof result.active_count === "number") {
		currentActiveUsers = result.active_count;
		peakActiveUsers = Math.max(peakActiveUsers, result.active_count);
		notifyActiveUsersSubscribers();
	}
}

async function disconnectSession(): Promise<void> {
	if (!currentSessionId) return;

	try {
		if (typeof navigator.sendBeacon === "function" && browser) {
			const payload = new Blob(
				[JSON.stringify({ session_id: currentSessionId })],
				{ type: "application/json" },
			);

			if (
				document.visibilityState === "hidden" &&
				navigator.sendBeacon(
					`${getTrailbaseBaseUrl()}/connection/disconnect`,
					payload,
				)
			) {
				return;
			}
		}

		const response = await fetch(
			`${getTrailbaseBaseUrl()}/connection/disconnect`,
			{
				method: "POST",
				keepalive: true,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					session_id: currentSessionId,
				}),
			},
		);

		if (!response.ok) {
			return;
		}

		const result = (await response.json()) as {
			success?: boolean;
			active_count?: number;
		};

		if (result.success && typeof result.active_count === "number") {
			currentActiveUsers = result.active_count;
			notifyActiveUsersSubscribers();
		}
	} catch (error) {
		if (!shouldSuppressDisconnectError(error)) {
			console.warn("Failed to disconnect TrailBase session:", error);
		}
	}
}

function startHeartbeat(): void {
	if (heartbeatInterval) return;

	heartbeatInterval = setInterval(() => {
		void sendHeartbeat().catch((error) => {
			console.warn("TrailBase heartbeat failed:", error);
		});
	}, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat(): void {
	if (!heartbeatInterval) return;
	clearInterval(heartbeatInterval);
	heartbeatInterval = null;
}

function registerUnloadHandlers(): void {
	if (!browser || unloadHandlerRegistered) return;

	const handleUnload = (event: Event) => {
		if (event.type === "pagehide") {
			const pagehideEvent = event as PageTransitionEvent;
			if (pagehideEvent.persisted) {
				return;
			}
		}

		stopHeartbeat();
		void disconnectSession();
	};

	window.addEventListener("beforeunload", handleUnload);
	window.addEventListener("pagehide", handleUnload);
	unloadHandlerRegistered = true;
}

export async function initializeGlobalConnection(): Promise<void> {
	if (!browser) return;
	if (isInitialized) return;
	if (isInitializing && initializationPromise) {
		return initializationPromise;
	}

	isInitializing = true;

	initializationPromise = (async () => {
		try {
			if (!connectionStateUnsubscribe) {
				connectionStateUnsubscribe = trailbaseClient.subscribeToConnectionState(
					GLOBAL_CONNECTION_ID,
					(state) => {
						applyConnectionState(state);
					},
				);
			}

			await trailbaseClient.retainConnection(GLOBAL_CONNECTION_ID);

			if (!activeUsersUnsubscribe) {
				activeUsersUnsubscribe = activeUsersClient.subscribe(
					ACTIVE_USERS_SUBSCRIPTION_ID,
					(stats) => {
						applyActiveUsers(stats);
					},
				);
			}

			await refreshActiveUsers();
			registerUnloadHandlers();
			await sendHeartbeat();
			startHeartbeat();

			applyConnectionState(trailbaseClient.getConnectionState());
			isInitialized = true;
		} catch (error) {
			console.error("Failed to initialize global TrailBase connection:", error);
			globalConnectionState = {
				...globalConnectionState,
				connected: false,
				connecting: false,
				error: error instanceof Error ? error : new Error(String(error)),
			};
			notifyConnectionStateSubscribers();
			throw error;
		} finally {
			isInitializing = false;
		}
	})();

	return initializationPromise;
}

export function cleanupGlobalConnection(): void {
	stopHeartbeat();
	activeUsersUnsubscribe?.();
	activeUsersUnsubscribe = null;
	connectionStateUnsubscribe?.();
	connectionStateUnsubscribe = null;
	trailbaseClient.releaseConnection(GLOBAL_CONNECTION_ID);
	void disconnectSession();
	currentSessionId = null;
	isInitialized = false;
	isInitializing = false;
	initializationPromise = null;
}

export function subscribeToGlobalConnection(
	callback: (state: ConnectionState) => void,
): () => void {
	connectionStateSubscribers.add(callback);
	callback({ ...globalConnectionState });

	return () => {
		connectionStateSubscribers.delete(callback);
	};
}

export function subscribeToActiveUsers(
	callback: (count: number, peak: number) => void,
): () => void {
	activeUsersSubscribers.add(callback);
	callback(currentActiveUsers, peakActiveUsers);

	return () => {
		activeUsersSubscribers.delete(callback);
	};
}

export function getGlobalConnectionState(): ConnectionState {
	return { ...globalConnectionState };
}

export function getCurrentActiveUsers(): { current: number; peak: number } {
	return { current: currentActiveUsers, peak: peakActiveUsers };
}

export function getGlobalConnectionDebugInfo() {
	return {
		isInitialized,
		isInitializing,
		autoInitialized,
		connectionState: getGlobalConnectionState(),
		activeUsers: getCurrentActiveUsers(),
	};
}

export async function retryGlobalConnection(): Promise<void> {
	if (globalConnectionState.connecting) return;

	globalConnectionState = {
		...globalConnectionState,
		connecting: true,
		error: null,
	};
	notifyConnectionStateSubscribers();

	try {
		await trailbaseClient.reconnect();
		await refreshActiveUsers();
		await sendHeartbeat();
		applyConnectionState(trailbaseClient.getConnectionState());
	} catch (error) {
		globalConnectionState = {
			...globalConnectionState,
			connecting: false,
			error: error instanceof Error ? error : new Error(String(error)),
		};
		notifyConnectionStateSubscribers();
	}
}

export function enableAutoInitialization(): void {
	if (!browser || autoInitialized) return;
	autoInitialized = true;

	void initializeGlobalConnection().catch((error) => {
		console.error("Auto initialization failed:", error);
	});
}

export const globalConnection = {
	get state() {
		return globalConnectionState;
	},
	get activeUsers() {
		return currentActiveUsers;
	},
	get peakUsers() {
		return peakActiveUsers;
	},
};

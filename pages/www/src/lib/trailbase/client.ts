/**
 * TrailBase client singleton (plain TypeScript without runes)
 * Improved error handling, reconnection logic, and type safety
 */

import { browser } from "$app/environment";
import type { Client, Event as TrailbaseEvent } from "trailbase";
import { getTrailbaseBrowserBaseUrl } from "./browser-base";
import { shouldSuppressStreamError } from "./stream-errors";
import type {
	ConnectionState,
	ConnectionStateCallback,
	LottoDrawScanCount,
	SubscriberCallback,
	TrailbaseError,
} from "./types";

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_BASE = 1000; // 1 second
const RETRY_DELAY_MAX = 30000; // 30 seconds
const CLEANUP_DELAY = 100; // 100ms delay before cleanup

class TrailBaseClient {
	private static instance: TrailBaseClient | null = null;

	private client: Client | null = null;
	private api: ReturnType<Client["records"]> | null = null;
	private stream: ReadableStream<TrailbaseEvent> | null = null;
	private reader: ReadableStreamDefaultReader<TrailbaseEvent> | null = null;

	// Initialization tracking
	private isInitializing = false;
	private isInitialized = false;
	private initializationPromise: Promise<void> | null = null;

	// Use plain object instead of $state
	private connectionState: ConnectionState = {
		connected: false,
		connecting: false,
		error: null,
		lastConnected: null,
		retryCount: 0,
	};

	private subscribers = new Map<string, SubscriberCallback>();
	private retainedConnections = new Set<string>();
	private connectionStateSubscribers = new Map<
		string,
		ConnectionStateCallback
	>();
	private retryTimeoutId: number | null = null;
	private stopping = false;

	private constructor() {
		if (!browser) return;

		// Set initial connecting state
		this.updateConnectionState({
			connected: false,
			connecting: true,
			error: null,
			retryCount: 0,
		});

		// Start initialization but don't await it in constructor
		this.initializationPromise = this.initializeClient();
	}

	static getInstance(): TrailBaseClient {
		if (!TrailBaseClient.instance) {
			TrailBaseClient.instance = new TrailBaseClient();
		}
		return TrailBaseClient.instance;
	}

	private async initializeClient(): Promise<void> {
		if (this.isInitializing || this.isInitialized) {
			return;
		}

		this.isInitializing = true;

		try {
			const { initClient } = await import("trailbase");
			const url = getTrailbaseBrowserBaseUrl();

			this.client = initClient(url);
			this.api = this.client.records("lotto_draw_scan_counts");

			this.isInitialized = true;

			this.updateConnectionState({
				connected: false, // 클라이언트 초기화와 스트림 연결을 분리
				connecting: false,
				error: null,
				retryCount: 0,
				lastConnected: null,
			});

			// Start stream if there are waiting subscribers or a retained connection.
			if (this.shouldKeepStreamAlive()) {
				void this.startStream();
			}
		} catch (error) {
			console.error("❌ Failed to initialize TrailBase client:", error);

			const trailbaseError: TrailbaseError =
				error instanceof Error
					? Object.assign(error, { status: 500 })
					: new Error("Failed to initialize TrailBase client");

			this.updateConnectionState({
				connected: false,
				connecting: false,
				error: trailbaseError,
				retryCount: 0,
			});
		} finally {
			this.isInitializing = false;
		}
	}

	private updateConnectionState(updates: Partial<ConnectionState>): void {
		Object.assign(this.connectionState, updates);

		// Notify connection state subscribers
		for (const callback of this.connectionStateSubscribers.values()) {
			try {
				callback({ ...this.connectionState }); // Create a copy to avoid mutations
			} catch (err) {
				console.warn("Connection state callback error:", err);
			}
		}
	}

	private calculateRetryDelay(retryCount: number): number {
		// Exponential backoff with jitter
		const delay = Math.min(RETRY_DELAY_BASE * 2 ** retryCount, RETRY_DELAY_MAX);
		return delay + Math.random() * 1000; // Add jitter
	}

	private shouldKeepStreamAlive(): boolean {
		return this.subscribers.size > 0 || this.retainedConnections.size > 0;
	}

	private extractScanDataFromEvent(
		event: TrailbaseEvent,
	): LottoDrawScanCount | null {
		if ("Insert" in event) {
			return event.Insert as LottoDrawScanCount;
		}

		if ("Update" in event) {
			return event.Update as LottoDrawScanCount;
		}

		if ("Error" in event) {
			throw Object.assign(new Error(event.Error), {
				status: 500,
				code: "STREAM_EVENT_ERROR",
			}) as TrailbaseError;
		}

		return null;
	}

	private async startStream(): Promise<void> {
		if (
			!this.api ||
			this.connectionState.connecting ||
			this.connectionState.connected ||
			!this.shouldKeepStreamAlive()
		) {
			return;
		}

		this.updateConnectionState({ connecting: true, error: null });
		this.stopping = false;

		try {
			this.stream = await this.api.subscribe("*");

			if (this.stream) {
				this.reader = this.stream.getReader();
				this.updateConnectionState({
					connected: true,
					connecting: false,
					lastConnected: new Date(),
					retryCount: 0,
				});

				this.readStreamData();
			}
		} catch (error) {
			if (
				!shouldSuppressStreamError(
					error,
					this.stopping || !this.shouldKeepStreamAlive(),
				)
			) {
				console.error("❌ TrailBase stream connection failed:", error);
			}

			const trailbaseError: TrailbaseError =
				error instanceof Error
					? Object.assign(error, {
							status: (error as { status?: number }).status || 500,
							code: (error as { code?: string }).code || "CONNECTION_ERROR",
						})
					: new Error("Stream connection failed");

			this.updateConnectionState({
				connected: false,
				connecting: false,
				error: trailbaseError,
			});

			if (!this.stopping) {
				this.scheduleRetry();
			}
		}
	}

	private async readStreamData(): Promise<void> {
		if (!this.reader) return;

		let shouldRetry = false;
		let connectionError: TrailbaseError | null = null;

		try {
			while (this.connectionState.connected && this.reader) {
				const { done, value } = await this.reader.read();

				if (done) {
					shouldRetry = this.shouldKeepStreamAlive();
					break;
				}

				if (value) {
					const scanData = this.extractScanDataFromEvent(value);
					if (!scanData) {
						continue;
					}

					// Notify all subscribers
					for (const callback of this.subscribers.values()) {
						try {
							callback(scanData);
						} catch (err) {
							console.warn("Subscriber callback error:", err);
						}
					}
				}
			}
		} catch (error) {
			connectionError =
				error instanceof Error
					? Object.assign(error, {
							status: (error as { status?: number }).status || 500,
							code: (error as { code?: string }).code || "STREAM_READ_ERROR",
						})
					: new Error("Stream read error");

			shouldRetry = this.shouldKeepStreamAlive();
		}

		await this.cleanup({ clearRetryTimeout: false });

		if (
			connectionError &&
			!shouldSuppressStreamError(
				connectionError,
				this.stopping || !this.shouldKeepStreamAlive(),
			)
		) {
			this.updateConnectionState({
				connected: false,
				connecting: false,
				error: connectionError,
			});
		} else if (!connectionError) {
			this.updateConnectionState({
				connected: false,
				connecting: false,
			});
		}

		if (shouldRetry && this.shouldKeepStreamAlive()) {
			this.scheduleRetry();
		}
	}

	private scheduleRetry(): void {
		if (!this.shouldKeepStreamAlive()) {
			return;
		}

		if (this.connectionState.retryCount >= MAX_RETRY_ATTEMPTS) {
			console.warn("Max retry attempts reached");
			return;
		}

		if (this.retryTimeoutId) {
			clearTimeout(this.retryTimeoutId);
		}

		const delay = this.calculateRetryDelay(this.connectionState.retryCount);

		this.retryTimeoutId = setTimeout(() => {
			this.updateConnectionState({
				retryCount: this.connectionState.retryCount + 1,
			});

			void this.startStream();
		}, delay) as unknown as number;
	}

	private async cleanup(
		options: { clearRetryTimeout?: boolean } = {},
	): Promise<void> {
		const { clearRetryTimeout = true } = options;
		this.stopping = true;

		this.updateConnectionState({
			connected: false,
			connecting: false,
		});

		if (clearRetryTimeout && this.retryTimeoutId) {
			clearTimeout(this.retryTimeoutId);
			this.retryTimeoutId = null;
		}

		if (this.reader) {
			try {
				await this.reader.cancel();
			} catch {
				// Ignore shutdown-time reader cancellation errors.
			}
			this.reader = null;
		}

		this.stream = null;
	}

	// Ensure client is initialized before proceeding
	private async ensureInitialized(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		if (this.initializationPromise) {
			await this.initializationPromise;
			return;
		}

		// If no initialization promise exists, start initialization
		this.initializationPromise = this.initializeClient();
		await this.initializationPromise;
	}

	// Public API

	subscribe(id: string, callback: SubscriberCallback): () => void {
		this.subscribers.set(id, callback);
		this.stopping = false;

		// Start stream if this is the first subscriber
		if (
			this.shouldKeepStreamAlive() &&
			!this.connectionState.connected &&
			!this.connectionState.connecting
		) {
			void this.ensureInitialized().then(() => this.startStream());
		}

		return () => {
			this.subscribers.delete(id);

			// Schedule cleanup if no subscribers left
			setTimeout(() => {
				if (!this.shouldKeepStreamAlive()) {
					void this.cleanup();
				}
			}, CLEANUP_DELAY);
		};
	}

	async retainConnection(id: string): Promise<void> {
		this.retainedConnections.add(id);
		this.stopping = false;
		await this.ensureInitialized();
		await this.startStream();
	}

	releaseConnection(id: string): void {
		this.retainedConnections.delete(id);
		if (!this.shouldKeepStreamAlive()) {
			this.stopping = true;
			void this.cleanup();
		}
	}

	subscribeToConnectionState(
		id: string,
		callback: ConnectionStateCallback,
	): () => void {
		this.connectionStateSubscribers.set(id, callback);

		// Immediately call with current state
		callback({ ...this.connectionState });

		return () => {
			this.connectionStateSubscribers.delete(id);
		};
	}

	async getScanDataSafely(round: number): Promise<LottoDrawScanCount | null> {
		try {
			// Wait for initialization before proceeding
			await this.ensureInitialized();

			if (!this.api) {
				console.warn(
					"🚨 TrailBase API still not available after initialization",
				);
				return null;
			}

			const scanData = (await this.api.read(
				round.toString(),
			)) as unknown as LottoDrawScanCount;

			if (scanData) {
			}

			return scanData;
		} catch (error) {
			const err = error as TrailbaseError;

			if (
				err.status === 404 ||
				err.message?.includes("404") ||
				err.message?.includes("Not Found")
			) {
				console.log(`ℹ️ Scan data for round ${round} not found (404)`);
				return null;
			}

			console.warn(`Scan data fetch error for round ${round}:`, err);
			return null;
		}
	}

	async getLatestScanData(): Promise<LottoDrawScanCount | null> {
		try {
			// Wait for initialization before proceeding
			await this.ensureInitialized();

			if (!this.api) {
				console.warn(
					"🚨 TrailBase API still not available after initialization",
				);
				return null;
			}

			const response = await this.api.list({
				order: ["-round"],
				pagination: { limit: 1 },
			});

			if (response.records.length > 0) {
				const scanData = response.records[0] as unknown as LottoDrawScanCount;
				return scanData;
			}

			console.warn("No scan data records found in database");
			return null;
		} catch (error) {
			console.error("Latest scan data fetch error:", error);
			return null;
		}
	}

	async reconnect(): Promise<void> {
		await this.cleanup();

		if (this.shouldKeepStreamAlive()) {
			this.updateConnectionState({ retryCount: 0 });
			await this.startStream();
		}
	}

	// Getters for reactive state
	get connected(): boolean {
		return this.connectionState.connected;
	}

	get connecting(): boolean {
		return this.connectionState.connecting;
	}

	get error(): TrailbaseError | null {
		return this.connectionState.error;
	}

	get lastConnected(): Date | null {
		return this.connectionState.lastConnected;
	}

	get retryCount(): number {
		return this.connectionState.retryCount;
	}

	get initialized(): boolean {
		return this.isInitialized;
	}

	get initializing(): boolean {
		return this.isInitializing;
	}

	// Get current connection state (useful for non-reactive access)
	getConnectionState(): ConnectionState {
		return { ...this.connectionState };
	}
}

// Export singleton instance and convenience functions
export const trailbaseClient = TrailBaseClient.getInstance();

export const subscribeToScanCountUpdates = (
	id: string,
	callback: SubscriberCallback,
) => trailbaseClient.subscribe(id, callback);

export const subscribeToConnectionState = (
	id: string,
	callback: ConnectionStateCallback,
) => trailbaseClient.subscribeToConnectionState(id, callback);

export const getScanDataSafely = (round: number) =>
	trailbaseClient.getScanDataSafely(round);

export const getLatestScanData = () => trailbaseClient.getLatestScanData();

export const reconnectClient = () => trailbaseClient.reconnect();

export type { LottoDrawScanCount } from "./types";

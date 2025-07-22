/**
 * TrailBase client singleton (plain TypeScript without runes)
 * Improved error handling, reconnection logic, and type safety
 */

import { browser } from "$app/environment";
import { env } from "$env/dynamic/public";
import type { Client, Event as TrailbaseEvent } from "trailbase";
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
	private connectionStateSubscribers = new Map<
		string,
		ConnectionStateCallback
	>();
	private retryTimeoutId: number | null = null;

	private constructor() {
		if (!browser) return;

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

			const url = env.PUBLIC_TRAILBASE_URL || "http://localhost:4000";
			console.log("🔌 Initializing TrailBase client with URL:", url);

			this.client = initClient(url);
			this.api = this.client.records("lotto_draw_scan_counts");

			this.isInitialized = true;
			console.log("✅ TrailBase client initialized successfully");

			this.updateConnectionState({
				connected: false,
				connecting: false,
				error: null,
				retryCount: 0,
			});

			// Start stream if there are waiting subscribers
			if (
				this.subscribers.size > 0 &&
				!this.connectionState.connected &&
				!this.connectionState.connecting
			) {
				console.log("🔄 Starting stream for waiting subscribers...");
				this.startStream();
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

	private async startStream(): Promise<void> {
		if (
			!this.api ||
			this.connectionState.connecting ||
			this.connectionState.connected
		) {
			console.log("🔄 Stream start blocked:", {
				hasApi: !!this.api,
				connecting: this.connectionState.connecting,
				connected: this.connectionState.connected,
			});
			return;
		}

		console.log("🚀 Starting TrailBase stream...");
		this.updateConnectionState({ connecting: true, error: null });

		try {
			this.stream = await this.api.subscribe("*");

			if (this.stream) {
				console.log("✅ TrailBase stream connected successfully");
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
			console.error("❌ TrailBase stream connection failed:", error);

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

			this.scheduleRetry();
		}
	}

	private async readStreamData(): Promise<void> {
		if (!this.reader) return;

		try {
			while (this.connectionState.connected && this.reader) {
				const { done, value } = await this.reader.read();

				if (done) {
					break;
				}

				if (value && "Update" in value) {
					const scanData = value.Update as unknown as LottoDrawScanCount;

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
			const trailbaseError: TrailbaseError =
				error instanceof Error
					? Object.assign(error, {
							status: (error as { status?: number }).status || 500,
							code: (error as { code?: string }).code || "STREAM_READ_ERROR",
						})
					: new Error("Stream read error");

			this.updateConnectionState({
				connected: false,
				error: trailbaseError,
			});

			this.scheduleRetry();
		} finally {
			await this.cleanup();
		}
	}

	private scheduleRetry(): void {
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

			if (this.subscribers.size > 0) {
				this.startStream();
			}
		}, delay) as unknown as number;
	}

	private async cleanup(): Promise<void> {
		this.updateConnectionState({
			connected: false,
			connecting: false,
		});

		if (this.retryTimeoutId) {
			clearTimeout(this.retryTimeoutId);
			this.retryTimeoutId = null;
		}

		if (this.reader) {
			try {
				await this.reader.cancel();
			} catch (err) {
				console.warn("Reader cancellation error:", err);
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

		// Start stream if this is the first subscriber
		if (
			this.subscribers.size === 1 &&
			!this.connectionState.connected &&
			!this.connectionState.connecting
		) {
			// Wait for client initialization if needed
			if (!this.api) {
				console.log("⏳ Waiting for TrailBase client initialization...");
				// Retry after initialization
				setTimeout(() => {
					if (
						this.api &&
						!this.connectionState.connected &&
						!this.connectionState.connecting
					) {
						this.startStream();
					}
				}, 100);
			} else {
				this.startStream();
			}
		}

		return () => {
			this.subscribers.delete(id);

			// Schedule cleanup if no subscribers left
			setTimeout(() => {
				if (this.subscribers.size === 0) {
					this.cleanup();
				}
			}, CLEANUP_DELAY);
		};
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

			console.log(`🔍 Fetching scan data for round ${round}`);
			const scanData = (await this.api.read(
				round.toString(),
			)) as unknown as LottoDrawScanCount;

			if (scanData) {
				console.log(`✅ Successfully fetched scan data for round ${round}:`, {
					round: scanData.round,
					totalScans: scanData.total_scans,
					hasScanData: scanData.scan_count_1 !== undefined,
				});
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

			console.warn(`❌ Scan data fetch error for round ${round}:`, err);
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

			console.log("🔍 Fetching latest scan data");
			const response = await this.api.list({
				order: ["-round"],
				pagination: { limit: 1 },
			});

			if (response.records.length > 0) {
				const scanData = response.records[0] as unknown as LottoDrawScanCount;
				console.log("✅ Successfully fetched latest scan data:", {
					round: scanData.round,
					totalScans: scanData.total_scans,
					hasScanData: scanData.scan_count_1 !== undefined,
				});
				return scanData;
			}

			console.warn("❌ No scan data records found in database");
			return null;
		} catch (error) {
			console.error("❌ Latest scan data fetch error:", error);
			return null;
		}
	}

	async reconnect(): Promise<void> {
		await this.cleanup();

		if (this.subscribers.size > 0) {
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

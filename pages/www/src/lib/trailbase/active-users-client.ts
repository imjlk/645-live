/**
 * Active Users TrailBase client (단순화된 구조)
 * 기존 trailbaseClient 패턴을 활용하여 active_users_stats 테이블 구독
 */

import { browser } from "$app/environment";
import type { Client, Event as TrailbaseEvent } from "trailbase";
import { getTrailbaseBrowserBaseUrl } from "./browser-base";
import { shouldSuppressStreamError } from "./stream-errors";

// 활성 유저 통계 타입
export type ActiveUsersStats = {
	id: number;
	current_count: number;
	peak_count: number;
	updated_at: string;
};

// 구독자 콜백 타입
type ActiveUsersCallback = (stats: ActiveUsersStats) => void;

const RETRY_DELAY_MS = 2000;

class ActiveUsersClient {
	private static instance: ActiveUsersClient | null = null;

	private client: Client | null = null;
	private api: ReturnType<Client["records"]> | null = null;
	private stream: ReadableStream<TrailbaseEvent> | null = null;
	private reader: ReadableStreamDefaultReader<TrailbaseEvent> | null = null;

	private isInitialized = false;
	private initializationPromise: Promise<void> | null = null;

	private subscribers = new Map<string, ActiveUsersCallback>();
	private connected = false;
	private connecting = false;
	private retryTimeoutId: number | null = null;
	private stopping = false;

	private constructor() {
		if (!browser) return;
		this.initializationPromise = this.initializeClient();
	}

	static getInstance(): ActiveUsersClient {
		if (!ActiveUsersClient.instance) {
			ActiveUsersClient.instance = new ActiveUsersClient();
		}
		return ActiveUsersClient.instance;
	}

	private async initializeClient(): Promise<void> {
		if (this.isInitialized) return;

		try {
			const { initClient } = await import("trailbase");
			const url = getTrailbaseBrowserBaseUrl();

			this.client = initClient(url);
			this.api = this.client.records("active_users_stats");
			this.isInitialized = true;

			// Start stream if there are waiting subscribers
			if (this.subscribers.size > 0) {
				void this.startStream();
			}
		} catch (error) {
			console.error("❌ Failed to initialize ActiveUsersClient:", error);
		}
	}

	private async startStream(): Promise<void> {
		if (!this.api || this.connecting || this.connected) {
			return;
		}

		this.connecting = true;
		this.stopping = false;

		try {
			this.stream = await this.api.subscribe("*");

			if (this.stream) {
				this.reader = this.stream.getReader();
				this.connected = true;
				this.connecting = false;
				void this.readStreamData();
			}
		} catch (error) {
			if (
				!shouldSuppressStreamError(
					error,
					this.stopping || this.subscribers.size === 0,
				)
			) {
				console.error("❌ Active users stream connection failed:", error);
			}
			this.connected = false;
			this.connecting = false;
		}
	}

	private async readStreamData(): Promise<void> {
		if (!this.reader) return;

		let shouldRetry = false;

		try {
			while (this.connected && this.reader) {
				const { done, value } = await this.reader.read();

				if (done) {
					shouldRetry = this.subscribers.size > 0;
					break;
				}

				let stats: ActiveUsersStats | null = null;
				if (value && "Insert" in value) {
					stats = value.Insert as ActiveUsersStats;
				} else if (value && "Update" in value) {
					stats = value.Update as ActiveUsersStats;
				} else if (value && "Error" in value) {
					throw new Error(value.Error);
				}

				if (stats) {
					// Notify all subscribers
					for (const callback of this.subscribers.values()) {
						try {
							callback(stats);
						} catch (err) {
							console.warn("Active users callback error:", err);
						}
					}
				}
			}
		} catch (error) {
			if (
				!shouldSuppressStreamError(
					error,
					this.stopping || this.subscribers.size === 0,
				)
			) {
				console.error("❌ Active users stream read error:", error);
			}
			shouldRetry = this.subscribers.size > 0;
		}

		await this.cleanup({ clearRetryTimeout: false });

		if (shouldRetry && this.subscribers.size > 0) {
			this.scheduleRetry();
		}
	}

	private scheduleRetry(): void {
		if (this.retryTimeoutId) {
			clearTimeout(this.retryTimeoutId);
		}

		this.retryTimeoutId = setTimeout(() => {
			void this.reconnect();
		}, RETRY_DELAY_MS) as unknown as number;
	}

	private async reconnect(): Promise<void> {
		try {
			await this.cleanup();
			if (this.subscribers.size > 0) {
				await this.startStream();
			}
		} catch (error) {
			console.error("❌ Failed to reconnect ActiveUsers:", error);
		}
	}

	private async cleanup(
		options: { clearRetryTimeout?: boolean } = {},
	): Promise<void> {
		const { clearRetryTimeout = true } = options;

		this.connected = false;
		this.connecting = false;
		this.stopping = true;

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

	// Public API
	subscribe(id: string, callback: ActiveUsersCallback): () => void {
		this.subscribers.set(id, callback);
		this.stopping = false;

		// Start stream if this is the first subscriber and client is ready
		if (this.subscribers.size === 1 && !this.connected && !this.connecting) {
			if (!this.isInitialized) {
				// Wait for initialization
				this.initializationPromise?.then(() => {
					if (!this.connected && !this.connecting) {
						this.startStream();
					}
				});
			} else {
				this.startStream();
			}
		}

		return () => {
			this.subscribers.delete(id);
			if (this.subscribers.size === 0) {
				this.stopping = true;
			}

			// Cleanup if no subscribers left
			setTimeout(() => {
				if (this.subscribers.size === 0) {
					void this.cleanup();
				}
			}, 100);
		};
	}

	async getCurrentStats(): Promise<ActiveUsersStats | null> {
		try {
			await this.initializationPromise;

			if (!this.api) {
				return null;
			}

			const response = await this.api.list({
				order: ["-id"],
				pagination: { limit: 1 },
			});

			if (response.records.length > 0) {
				return response.records[0] as unknown as ActiveUsersStats;
			}

			return null;
		} catch (error) {
			console.error("Failed to get current active users stats:", error);
			return null;
		}
	}
}

// Export singleton instance and convenience functions
export const activeUsersClient = ActiveUsersClient.getInstance();

export const subscribeToActiveUsers = (
	id: string,
	callback: ActiveUsersCallback,
) => activeUsersClient.subscribe(id, callback);

export const getCurrentActiveUsersStats = () =>
	activeUsersClient.getCurrentStats();

/**
 * Active Users TrailBase client (단순화된 구조)
 * 기존 trailbaseClient 패턴을 활용하여 active_users_stats 테이블 구독
 */

import { browser } from "$app/environment";
import { env } from "$env/dynamic/public";
import type { Client, Event as TrailbaseEvent } from "trailbase";

// 활성 유저 통계 타입
export type ActiveUsersStats = {
	id: number;
	current_count: number;
	peak_count: number;
	updated_at: string;
};

// 구독자 콜백 타입
type ActiveUsersCallback = (stats: ActiveUsersStats) => void;

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
			const url = env.PUBLIC_TRAILBASE_URL || "http://localhost:4000";

			this.client = initClient(url);
			this.api = this.client.records("active_users_stats");
			this.isInitialized = true;

			console.log("✅ ActiveUsersClient initialized");

			// Start stream if there are waiting subscribers
			if (this.subscribers.size > 0) {
				this.startStream();
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

		try {
			console.log("🔌 Starting active users stream subscription...");
			this.stream = await this.api.subscribe("*");

			if (this.stream) {
				this.reader = this.stream.getReader();
				this.connected = true;
				this.connecting = false;

				console.log("✅ Active users stream connected");
				this.readStreamData();
			}
		} catch (error) {
			console.error("❌ Active users stream connection failed:", error);
			this.connected = false;
			this.connecting = false;
		}
	}

	private async readStreamData(): Promise<void> {
		if (!this.reader) return;

		try {
			while (this.connected && this.reader) {
				const { done, value } = await this.reader.read();

				if (done) break;

				if (value && "Update" in value) {
					const stats = value.Update as unknown as ActiveUsersStats;
					console.log("📊 Active users update received:", stats);

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
			console.error("❌ Active users stream read error:", error);
			this.connected = false;
			await this.cleanup();
		}
	}

	private async cleanup(): Promise<void> {
		this.connected = false;
		this.connecting = false;

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

	// Public API
	subscribe(id: string, callback: ActiveUsersCallback): () => void {
		this.subscribers.set(id, callback);

		// Start stream if this is the first subscriber and client is ready
		if (
			this.subscribers.size === 1 &&
			!this.connected &&
			!this.connecting
		) {
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

			// Cleanup if no subscribers left
			setTimeout(() => {
				if (this.subscribers.size === 0) {
					this.cleanup();
				}
			}, 100);
		};
	}

	async getCurrentStats(): Promise<ActiveUsersStats | null> {
		try {
			await this.initializationPromise;

			if (!this.api) {
				console.warn("ActiveUsersClient API not available");
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
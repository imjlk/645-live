/**
 * Active users client
 * - Subscribes to active_user_sessions changes
 * - Recomputes the active user count from the session table
 */

import type { Client, Event as TrailbaseEvent } from "trailbase";
import { browser } from "$app/environment";
import { getTrailbaseBrowserBaseUrl } from "./browser-base";
import { shouldSuppressStreamError } from "./stream-errors";

export type ActiveUsersStats = {
	id: number;
	current_count: number;
	peak_count: number;
	updated_at: string;
};

type ActiveUserSession = {
	id: number;
	session_id: string;
	user_agent?: string | null;
	connected_at: string;
	last_seen: string;
	page_path?: string | null;
};

type ActiveUsersCallback = (stats: ActiveUsersStats) => void;

const ACTIVE_USER_WINDOW_MS = 2 * 60 * 1000;
const RETRY_DELAY_MS = 2_000;
const INITIAL_FETCH_LIMIT = 200;

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
	private stopping = false;
	private retryTimeoutId: number | null = null;
	private peakCount = 0;
	private latestStats: ActiveUsersStats | null = null;

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
			this.client = initClient(getTrailbaseBrowserBaseUrl());
			this.api = this.client.records("active_user_sessions");
			this.isInitialized = true;

			if (this.subscribers.size > 0) {
				await this.refreshSnapshot();
				void this.startStream();
			}
		} catch (error) {
			console.error("Failed to initialize ActiveUsersClient:", error);
		}
	}

	private getCutoffIso(): string {
		return new Date(Date.now() - ACTIVE_USER_WINDOW_MS).toISOString();
	}

	private buildStats(sessions: ActiveUserSession[]): ActiveUsersStats {
		const cutoffIso = this.getCutoffIso();
		const currentCount = sessions.filter(
			(session) => session.last_seen > cutoffIso,
		).length;
		this.peakCount = Math.max(this.peakCount, currentCount);

		return {
			id: 1,
			current_count: currentCount,
			peak_count: this.peakCount,
			updated_at: new Date().toISOString(),
		};
	}

	private notifySubscribers(stats: ActiveUsersStats): void {
		for (const callback of this.subscribers.values()) {
			try {
				callback(stats);
			} catch (error) {
				console.warn("Active users callback error:", error);
			}
		}
	}

	private async refreshSnapshot(): Promise<ActiveUsersStats | null> {
		await this.initializationPromise;
		if (!this.api) {
			return null;
		}

		try {
			const response = await this.api.list({
				order: ["-last_seen"],
				pagination: { limit: INITIAL_FETCH_LIMIT },
			});
			const stats = this.buildStats(
				response.records as unknown as ActiveUserSession[],
			);
			this.latestStats = stats;
			this.notifySubscribers(stats);
			return stats;
		} catch (error) {
			console.warn("Failed to refresh active user sessions snapshot:", error);
			return this.latestStats;
		}
	}

	private async startStream(): Promise<void> {
		if (
			!this.api ||
			this.connecting ||
			this.connected ||
			this.subscribers.size === 0
		) {
			return;
		}

		this.connecting = true;
		this.stopping = false;

		try {
			this.stream = await this.api.subscribeAll();
			this.reader = this.stream.getReader();
			this.connected = true;
			this.connecting = false;
			void this.readStreamData();
		} catch (error) {
			if (
				!shouldSuppressStreamError(
					error,
					this.stopping || this.subscribers.size === 0,
				)
			) {
				console.error("Active user sessions stream connection failed:", error);
			}
			this.connected = false;
			this.connecting = false;
		}
	}

	private async readStreamData(): Promise<void> {
		if (!this.reader) {
			return;
		}

		let shouldRetry = false;

		try {
			while (this.connected && this.reader) {
				const { done, value } = await this.reader.read();

				if (done) {
					shouldRetry = this.subscribers.size > 0;
					break;
				}

				if (value && "Error" in value) {
					throw new Error(value.Error);
				}

				if (
					value &&
					("Insert" in value || "Update" in value || "Delete" in value)
				) {
					await this.refreshSnapshot();
				}
			}
		} catch (error) {
			if (
				!shouldSuppressStreamError(
					error,
					this.stopping || this.subscribers.size === 0,
				)
			) {
				console.error("Active user sessions stream read error:", error);
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
			await this.refreshSnapshot();
			if (this.subscribers.size > 0) {
				await this.startStream();
			}
		} catch (error) {
			console.error("Failed to reconnect active user sessions stream:", error);
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

	subscribe(id: string, callback: ActiveUsersCallback): () => void {
		this.subscribers.set(id, callback);
		this.stopping = false;

		if (this.latestStats) {
			callback(this.latestStats);
		}

		if (!this.isInitialized) {
			void this.initializationPromise?.then(async () => {
				await this.refreshSnapshot();
				if (!this.connected && !this.connecting) {
					await this.startStream();
				}
			});
		} else {
			void this.refreshSnapshot();
			if (!this.connected && !this.connecting) {
				void this.startStream();
			}
		}

		return () => {
			this.subscribers.delete(id);
			if (this.subscribers.size === 0) {
				this.stopping = true;
				setTimeout(() => {
					if (this.subscribers.size === 0) {
						void this.cleanup();
					}
				}, 100);
			}
		};
	}

	async getCurrentStats(): Promise<ActiveUsersStats | null> {
		return this.refreshSnapshot();
	}
}

export const activeUsersClient = ActiveUsersClient.getInstance();

export async function getCurrentActiveUsersStats(): Promise<ActiveUsersStats | null> {
	return activeUsersClient.getCurrentStats();
}

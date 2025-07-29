/**
 * Active Users 전용 TrailBase 클라이언트
 * active_users_stats 테이블 변경 사항을 실시간으로 구독
 */

import { browser } from "$app/environment";
import { env } from "$env/dynamic/public";
import type { Client, Event as TrailbaseEvent } from "trailbase";

interface ActiveUsersStats {
	id: number;
	current_count: number;
	peak_count: number;
	updated_at: string;
}

type ActiveUsersCallback = (data: ActiveUsersStats) => void;

class ActiveUsersClient {
	private static instance: ActiveUsersClient | null = null;
	
	private client: Client | null = null;
	private stream: ReadableStream<TrailbaseEvent> | null = null;
	private reader: ReadableStreamDefaultReader<TrailbaseEvent> | null = null;
	private subscribers = new Map<string, ActiveUsersCallback>();
	private isInitialized = false;
	private isConnected = false;

	static getInstance(): ActiveUsersClient {
		if (!ActiveUsersClient.instance) {
			ActiveUsersClient.instance = new ActiveUsersClient();
		}
		return ActiveUsersClient.instance;
	}

	async initialize(): Promise<void> {
		if (!browser || this.isInitialized) return;

		try {
			const { initClient } = await import("trailbase");
			this.client = initClient(env.PUBLIC_TRAILBASE_URL || "http://localhost:4000");
			
			await this.startStream();
			this.isInitialized = true;
			
			console.log('✅ ActiveUsersClient initialized');
		} catch (error) {
			console.error('❌ Failed to initialize ActiveUsersClient:', error);
			throw error;
		}
	}

	private async startStream(): Promise<void> {
		if (!this.client) throw new Error("Client not initialized");

		try {
			// active_users_stats 테이블의 변경 사항을 스트림으로 구독
			const api = this.client.records("active_users_stats");
			this.stream = await api.subscribe("*");
			
			if (this.stream) {
				this.reader = this.stream.getReader();
				this.isConnected = true;

				console.log('🔗 ActiveUsers stream started');
				
				// 스트림 읽기 시작
				this.readStream();
			} else {
				throw new Error("Failed to create stream");
			}
		} catch (error) {
			console.error('❌ Failed to start ActiveUsers stream:', error);
			this.isConnected = false;
			throw error;
		}
	}

	private async readStream(): Promise<void> {
		if (!this.reader) return;

		try {
			while (true) {
				const { done, value } = await this.reader.read();
				
				if (done) {
					console.log('ActiveUsers stream ended');
					break;
				}

				if (value && "Update" in value) {
					const activeUsersData = value.Update as unknown as ActiveUsersStats;
					
					console.log('[ActiveUsers] Received update:', activeUsersData);
					
					// 모든 구독자에게 알림
					for (const callback of this.subscribers.values()) {
						try {
							callback(activeUsersData);
						} catch (err) {
							console.warn("ActiveUsers subscriber callback error:", err);
						}
					}
				}
			}
		} catch (error) {
			console.error('Error reading ActiveUsers stream:', error);
			this.isConnected = false;
			
			// 재연결 시도
			setTimeout(() => {
				if (this.subscribers.size > 0) {
					this.reconnect();
				}
			}, 2000);
		}
	}

	subscribe(id: string, callback: ActiveUsersCallback): () => void {
		this.subscribers.set(id, callback);
		
		// 연결이 안되어 있으면 초기화 시도
		if (!this.isConnected && !this.isInitialized) {
			this.initialize().catch(console.error);
		}

		return () => {
			this.subscribers.delete(id);
		};
	}

	private async reconnect(): Promise<void> {
		try {
			await this.cleanup();
			await this.startStream();
			console.log('✅ ActiveUsers reconnected');
		} catch (error) {
			console.error('❌ Failed to reconnect ActiveUsers:', error);
		}
	}

	private async cleanup(): Promise<void> {
		if (this.reader) {
			try {
				await this.reader.cancel();
			} catch (error) {
				console.warn('Error canceling ActiveUsers reader:', error);
			}
			this.reader = null;
		}

		if (this.stream) {
			try {
				await this.stream.cancel();
			} catch (error) {
				console.warn('Error canceling ActiveUsers stream:', error);
			}
			this.stream = null;
		}

		this.isConnected = false;
	}

	get connected(): boolean {
		return this.isConnected;
	}
}

export const activeUsersClient = ActiveUsersClient.getInstance();
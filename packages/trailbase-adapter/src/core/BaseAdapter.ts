/**
 * Base adapter class with common functionality
 */

import type {
	RealtimeAdapter,
	ConnectionState,
	ReconnectConfig,
	AdapterError,
	ConnectionStateCallback,
	BaseRecord,
} from '../types/index.js';

export abstract class BaseAdapter<T extends BaseRecord = BaseRecord>
	implements RealtimeAdapter<T>
{
	protected connectionState: ConnectionState = {
		connected: false,
		connecting: false,
		error: null,
		lastConnected: null,
		retryCount: 0,
	};

	protected connectionStateSubscribers = new Map<string, ConnectionStateCallback>();
	protected retryTimeoutId: number | null = null;

	protected readonly reconnectConfig: ReconnectConfig = {
		maxAttempts: 5,
		baseDelay: 1000,
		maxDelay: 30000,
		jitter: true,
	};

	// Simple in-memory cache
	protected cache = new Map<string, { data: unknown; timestamp: number }>();
	protected cacheConfig = {
		enabled: true,
		ttl: 30000, // 30 seconds
	};

	constructor(config?: {
		reconnect?: Partial<ReconnectConfig>;
		cache?: { enabled: boolean; ttl: number };
	}) {
		if (config?.reconnect) {
			Object.assign(this.reconnectConfig, config.reconnect);
		}
		if (config?.cache) {
			Object.assign(this.cacheConfig, config.cache);
		}
	}

	// Abstract methods that must be implemented by concrete adapters
	abstract connect(): Promise<void>;
	abstract disconnect(): Promise<void>;
	abstract subscribe(
		options: import('../types/index.js').SubscriptionOptions,
		callback: import('../types/index.js').SubscriberCallback<T>,
	): () => void;
	abstract findOne(table: string, id: string | number): Promise<T | null>;
	abstract findMany(
		table: string,
		options?: import('../types/index.js').QueryOptions,
	): Promise<import('../types/index.js').QueryResult<T>>;
	abstract create(table: string, data: Partial<T>): Promise<T>;
	abstract update(
		table: string,
		id: string | number,
		data: Partial<T>,
	): Promise<T>;
	abstract delete(table: string, id: string | number): Promise<void>;

	// Common implementations
	async reconnect(): Promise<void> {
		await this.disconnect();
		this.updateConnectionState({ retryCount: 0 });
		await this.connect();
	}

	isConnected(): boolean {
		return this.connectionState.connected;
	}

	getConnectionState(): ConnectionState {
		return { ...this.connectionState };
	}

	subscribeToConnectionState(callback: ConnectionStateCallback): () => void {
		const id = `connection-${Date.now()}-${Math.random()}`;
		this.connectionStateSubscribers.set(id, callback);

		// Immediately call with current state
		callback({ ...this.connectionState });

		return () => {
			this.connectionStateSubscribers.delete(id);
		};
	}

	// Cache management
	protected getCached<U = unknown>(key: string): U | null {
		if (!this.cacheConfig.enabled) return null;

		const cached = this.cache.get(key);
		if (cached) {
			const age = Date.now() - cached.timestamp;
			if (age < this.cacheConfig.ttl) {
				return cached.data as U;
			}
			this.cache.delete(key);
		}
		return null;
	}

	protected setCached(key: string, data: unknown): void {
		if (!this.cacheConfig.enabled) return;
		this.cache.set(key, { data, timestamp: Date.now() });
	}

	clearCache(): void {
		this.cache.clear();
	}

	// Connection state management
	protected updateConnectionState(updates: Partial<ConnectionState>): void {
		Object.assign(this.connectionState, updates);

		// Notify subscribers
		for (const callback of this.connectionStateSubscribers.values()) {
			try {
				callback({ ...this.connectionState });
			} catch (err) {
				console.warn('Connection state callback error:', err);
			}
		}
	}

	// Retry logic
	protected calculateRetryDelay(retryCount: number): number {
		const delay = Math.min(
			this.reconnectConfig.baseDelay * 2 ** retryCount,
			this.reconnectConfig.maxDelay,
		);
		
		if (this.reconnectConfig.jitter) {
			return delay + Math.random() * 1000;
		}
		
		return delay;
	}

	protected scheduleRetry(callback: () => Promise<void>): void {
		if (this.connectionState.retryCount >= this.reconnectConfig.maxAttempts) {
			console.warn('Max retry attempts reached');
			return;
		}

		if (this.retryTimeoutId) {
			clearTimeout(this.retryTimeoutId);
		}

		const delay = this.calculateRetryDelay(this.connectionState.retryCount);

		this.retryTimeoutId = setTimeout(async () => {
			this.updateConnectionState({
				retryCount: this.connectionState.retryCount + 1,
			});

			try {
				await callback();
			} catch (error) {
				console.error('Retry failed:', error);
				this.scheduleRetry(callback);
			}
		}, delay) as unknown as number;
	}

	// Error handling
	protected createAdapterError(
		error: unknown,
		defaultMessage = 'Adapter operation failed',
	): AdapterError {
		if (error instanceof Error) {
			return Object.assign(error, {
				status: (error as { status?: number }).status || 500,
				code: (error as { code?: string }).code || 'ADAPTER_ERROR',
			});
		}
		
		const adapterError = new Error(defaultMessage) as AdapterError;
		adapterError.status = 500;
		adapterError.code = 'ADAPTER_ERROR';
		return adapterError;
	}

	// Cleanup
	async destroy(): Promise<void> {
		if (this.retryTimeoutId) {
			clearTimeout(this.retryTimeoutId);
			this.retryTimeoutId = null;
		}

		await this.disconnect();
		this.connectionStateSubscribers.clear();
		this.clearCache();
	}
}
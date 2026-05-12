/**
 * TrailBase specific adapter implementation
 */

import { BaseAdapter } from "../core/BaseAdapter.js";
import type {
	AdapterConfig,
	AuthAdapter,
	BaseRecord,
	CacheUtilities,
	QueryOptions,
	QueryResult,
	RecordUtilities,
	SubscriberCallback,
	SubscriptionOptions,
} from "../types/index.js";
import { TrailBaseAuthAdapter } from "./AuthAdapter.js";
import type {
	TrailBaseClient,
	TrailBaseEvent,
	TrailBaseRecordApi,
} from "./client-types.js";
import { TrailBaseCacheUtilities } from "./CacheUtilities.js";
import { TrailBaseRecordUtilities } from "./RecordUtilities.js";

export class TrailBaseAdapter<
	T extends BaseRecord = BaseRecord,
> extends BaseAdapter<T> {
	private client: TrailBaseClient<T> | null = null;
	private api: TrailBaseRecordApi<T> | null = null;
	private stream: ReadableStream<TrailBaseEvent> | null = null;
	private reader: ReadableStreamDefaultReader<TrailBaseEvent> | null = null;
	private subscribers = new Map<string, SubscriberCallback<T>>();
	private isInitializing = false;
	private isInitialized = false;
	private initializationPromise: Promise<void> | null = null;

	// Utility adapters
	public auth?: AuthAdapter;
	public records?: RecordUtilities<T>;
	public cacheUtils?: CacheUtilities;

	constructor(private config: AdapterConfig) {
		super(config);
	}

	async connect(): Promise<void> {
		if (this.isInitializing || this.isInitialized) {
			if (this.initializationPromise) {
				await this.initializationPromise;
			}
			return;
		}

		this.isInitializing = true;
		this.updateConnectionState({
			connected: false,
			connecting: true,
			error: null,
			retryCount: 0,
		});

		try {
			// Dynamic import to avoid SSR issues
			const { initClient } = await import("trailbase");
			const client = initClient(
				this.config.url,
			) as unknown as TrailBaseClient<T>;

			this.client = client;
			this.isInitialized = true;

			// Initialize utility adapters
			this.auth = new TrailBaseAuthAdapter(
				client as unknown as ConstructorParameters<
					typeof TrailBaseAuthAdapter
				>[0],
			);
			this.records = new TrailBaseRecordUtilities<T>(client);
			this.cacheUtils = new TrailBaseCacheUtilities(
				client,
				this.config.cache?.ttl || 5 * 60 * 1000, // 5 minutes default
			);

			this.updateConnectionState({
				connected: true,
				connecting: false,
				error: null,
				retryCount: 0,
				lastConnected: new Date(),
			});

			// Start stream if there are waiting subscribers
			if (this.subscribers.size > 0) {
				await this.startStream();
			}
		} catch (error) {
			console.error("❌ Failed to initialize TrailBase client:", error);

			const adapterError = this.createAdapterError(
				error,
				"Failed to initialize TrailBase client",
			);

			this.updateConnectionState({
				connected: false,
				connecting: false,
				error: adapterError,
				retryCount: 0,
			});

			throw adapterError;
		} finally {
			this.isInitializing = false;
		}
	}

	async disconnect(): Promise<void> {
		this.updateConnectionState({
			connected: false,
			connecting: false,
		});

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

	subscribe(
		options: SubscriptionOptions,
		callback: SubscriberCallback<T>,
	): () => void {
		const subscriberId = `${options.table}-${Date.now()}-${Math.random()}`;
		this.subscribers.set(subscriberId, callback);

		const client = this.client;
		if (!client) {
			return () => {
				this.subscribers.delete(subscriberId);
			};
		}

		// Ensure we have API instance for the table
		if (!this.api || this.api.tableName !== options.table) {
			this.api = client.records(options.table);
		}

		// Start stream if this is the first subscriber and we're connected
		if (this.subscribers.size === 1 && this.isInitialized && !this.stream) {
			this.startStream().catch((error) => {
				console.error("Failed to start stream:", error);
			});
		}

		return () => {
			this.subscribers.delete(subscriberId);

			// Stop stream if no subscribers left
			if (this.subscribers.size === 0) {
				this.disconnect().catch((error) => {
					console.error("Failed to disconnect:", error);
				});
			}
		};
	}

	private async startStream(): Promise<void> {
		if (!this.api || this.connectionState.connecting || this.stream) {
			return;
		}

		this.updateConnectionState({ connecting: true, error: null });

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
			console.error("❌ TrailBase stream connection failed:", error);

			const adapterError = this.createAdapterError(
				error,
				"Stream connection failed",
			);

			this.updateConnectionState({
				connected: false,
				connecting: false,
				error: adapterError,
			});

			this.scheduleRetry(() => this.startStream());
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
					const data = value.Update as T;

					// Notify all subscribers
					for (const callback of this.subscribers.values()) {
						try {
							callback(data);
						} catch (err) {
							console.warn("Subscriber callback error:", err);
						}
					}
				}
			}
		} catch (error) {
			const adapterError = this.createAdapterError(error, "Stream read error");

			this.updateConnectionState({
				connected: false,
				error: adapterError,
			});

			this.scheduleRetry(() => this.startStream());
		} finally {
			await this.disconnect();
		}
	}

	// Data operations
	async findOne(table: string, id: string | number): Promise<T | null> {
		await this.ensureInitialized();

		const cacheKey = `${table}:${id}`;
		const cached = this.getCached<T>(cacheKey);
		if (cached) return cached;

		try {
			if (!this.client) {
				throw new Error("TrailBase client not initialized");
			}

			const api = this.client.records(table);
			const data = await api.read(id.toString());

			if (data) {
				this.setCached(cacheKey, data);
				return data as T;
			}

			return null;
		} catch (error) {
			// Handle 404 gracefully
			const err = error as { status?: number; message?: string };
			if (
				err.status === 404 ||
				err.message?.includes("404") ||
				err.message?.includes("Not Found")
			) {
				return null;
			}

			throw this.createAdapterError(
				error,
				`Failed to find record ${id} in ${table}`,
			);
		}
	}

	async findMany(
		table: string,
		options: QueryOptions = {},
	): Promise<QueryResult<T>> {
		await this.ensureInitialized();

		const cacheKey = `${table}:list:${JSON.stringify(options)}`;
		const cached = this.getCached<QueryResult<T>>(cacheKey);
		if (cached) return cached;

		try {
			if (!this.client) {
				throw new Error("TrailBase client not initialized");
			}

			const api = this.client.records(table);
			const queryParams: Parameters<TrailBaseRecordApi<T>["list"]>[0] = {};

			if (options.order) {
				queryParams.order = options.order;
			}
			if (options.limit || options.offset) {
				queryParams.pagination = {
					limit: options.limit,
					offset: options.offset,
				};
			}
			if (options.filter) {
				queryParams.filter = options.filter;
			}

			const response = await api.list(queryParams);

			const result: QueryResult<T> = {
				records: (response.records || []) as T[],
				total: response.total,
				has_more: response.has_more,
			};

			this.setCached(cacheKey, result);
			return result;
		} catch (error) {
			throw this.createAdapterError(error, `Failed to query ${table}`);
		}
	}

	async create(table: string, data: Partial<T>): Promise<T> {
		await this.ensureInitialized();

		try {
			if (!this.client) {
				throw new Error("TrailBase client not initialized");
			}

			const api = this.client.records(table);
			const result = await api.create(data);

			// Invalidate list caches for this table
			this.invalidateTableCache(table);

			return result as T;
		} catch (error) {
			throw this.createAdapterError(
				error,
				`Failed to create record in ${table}`,
			);
		}
	}

	async update(
		table: string,
		id: string | number,
		data: Partial<T>,
	): Promise<T> {
		await this.ensureInitialized();

		try {
			if (!this.client) {
				throw new Error("TrailBase client not initialized");
			}

			const api = this.client.records(table);
			const result = await api.update(id.toString(), data);

			// Invalidate caches
			this.cache.delete(`${table}:${id}`);
			this.invalidateTableCache(table);

			return result as T;
		} catch (error) {
			throw this.createAdapterError(
				error,
				`Failed to update record ${id} in ${table}`,
			);
		}
	}

	async delete(table: string, id: string | number): Promise<void> {
		await this.ensureInitialized();

		try {
			if (!this.client) {
				throw new Error("TrailBase client not initialized");
			}

			const api = this.client.records(table);
			await api.delete(id.toString());

			// Invalidate caches
			this.cache.delete(`${table}:${id}`);
			this.invalidateTableCache(table);
		} catch (error) {
			throw this.createAdapterError(
				error,
				`Failed to delete record ${id} from ${table}`,
			);
		}
	}

	// Helper methods
	private async ensureInitialized(): Promise<void> {
		if (this.isInitialized) return;

		if (this.initializationPromise) {
			await this.initializationPromise;
			return;
		}

		this.initializationPromise = this.connect();
		await this.initializationPromise;
	}

	private invalidateTableCache(table: string): void {
		// Use the new cache utility if available
		if (this.cacheUtils) {
			this.cacheUtils.invalidateTable(table);
		}

		// Also invalidate BaseAdapter cache
		for (const key of this.cache.keys()) {
			if (key.startsWith(`${table}:list:`)) {
				this.cache.delete(key);
			}
		}
	}

	// Enhanced cache methods using the new cache utility
	override clearCache(): void {
		super.clearCache();
		if (this.cacheUtils) {
			this.cacheUtils.clearCache();
		}
	}

	// Add convenience method for latest data (specific to lotto use case)
	async getLatest(table: string): Promise<T | null> {
		return this.findMany(table, {
			order: ["-updated_at"],
			limit: 1,
		}).then((result) => result.records[0] || null);
	}
}

/**
 * Mock adapter for testing purposes
 */

import { BaseAdapter } from "../../src/core/BaseAdapter.js";
import type {
	AdapterError,
	BaseRecord,
	QueryOptions,
	QueryResult,
	SubscriberCallback,
	SubscriptionOptions,
} from "../../src/types/index.js";

export interface MockAdapterOptions {
	autoConnect?: boolean;
	connectionDelay?: number;
	shouldFailConnection?: boolean;
	mockData?: Record<string, BaseRecord[]>;
	simulateNetworkLatency?: number;
}

export class MockAdapter<
	T extends BaseRecord = BaseRecord,
> extends BaseAdapter<T> {
	private subscribers = new Map<string, SubscriberCallback<T>>();
	private connected = false;
	private connectionPromise: Promise<void> | null = null;

	// Mock data storage
	private mockData: Map<string, T[]> = new Map();
	private nextId = 1;

	constructor(private options: MockAdapterOptions = {}) {
		super({
			reconnect: {
				maxAttempts: 3,
				baseDelay: 100,
				maxDelay: 1000,
			},
			cache: {
				enabled: true,
				ttl: 5000,
			},
		});

		// Initialize mock data
		if (options.mockData) {
			for (const [table, records] of Object.entries(options.mockData)) {
				this.mockData.set(table, records as T[]);
			}
		}

		if (options.autoConnect) {
			this.connect();
		}
	}

	async connect(): Promise<void> {
		if (this.connected || this.connectionPromise) {
			return this.connectionPromise || Promise.resolve();
		}

		this.updateConnectionState({
			connecting: true,
			connected: false,
			error: null,
		});

		this.connectionPromise = new Promise((resolve, reject) => {
			setTimeout(() => {
				if (this.options.shouldFailConnection) {
					const error = this.createAdapterError(
						new Error("Mock connection failed"),
						"Mock connection failed",
					);
					this.updateConnectionState({
						connecting: false,
						connected: false,
						error,
					});
					reject(error);
				} else {
					this.connected = true;
					this.updateConnectionState({
						connecting: false,
						connected: true,
						error: null,
						lastConnected: new Date(),
					});
					resolve();
				}
			}, this.options.connectionDelay || 50);
		});

		return this.connectionPromise;
	}

	async disconnect(): Promise<void> {
		this.connected = false;
		this.connectionPromise = null;
		this.updateConnectionState({
			connected: false,
			connecting: false,
		});
	}

	subscribe(
		options: SubscriptionOptions,
		callback: SubscriberCallback<T>,
	): () => void {
		const subscriberId = `${options.table}-${Date.now()}-${Math.random()}`;
		this.subscribers.set(subscriberId, callback);

		return () => {
			this.subscribers.delete(subscriberId);
		};
	}

	async findOne(table: string, id: string | number): Promise<T | null> {
		await this.simulateDelay();

		const tableData = this.mockData.get(table) || [];
		const record = tableData.find((r) => r.id === id);

		if (record) {
			return { ...record } as T;
		}

		return null;
	}

	async findMany(
		table: string,
		options: QueryOptions = {},
	): Promise<QueryResult<T>> {
		await this.simulateDelay();

		let tableData = [...(this.mockData.get(table) || [])];

		// Apply filter
		const { filter } = options;
		if (filter) {
			tableData = tableData.filter((record) => {
				const typedRecord = record as Record<string, unknown>;
				return Object.entries(filter).every(([key, value]) => {
					return typedRecord[key] === value;
				});
			});
		}

		// Apply order
		if (options.order) {
			for (const orderBy of options.order) {
				const desc = orderBy.startsWith("-");
				const field = desc ? orderBy.slice(1) : orderBy;

				tableData.sort((a, b) => {
					const typedA = a as Record<string, unknown>;
					const typedB = b as Record<string, unknown>;
					const aVal = typedA[field];
					const bVal = typedB[field];

					if (aVal < bVal) return desc ? 1 : -1;
					if (aVal > bVal) return desc ? -1 : 1;
					return 0;
				});
			}
		}

		// Apply pagination
		const total = tableData.length;
		const offset = options.offset || 0;
		const limit = options.limit || total;

		const records = tableData
			.slice(offset, offset + limit)
			.map((r) => ({ ...r })) as T[];

		return {
			records,
			total,
			has_more: offset + limit < total,
		};
	}

	async create(table: string, data: Partial<T>): Promise<T> {
		await this.simulateDelay();

		const newRecord = {
			...data,
			id: this.nextId++,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		} as T;

		const tableData = this.mockData.get(table) || [];
		tableData.push(newRecord);
		this.mockData.set(table, tableData);

		// Notify subscribers
		this.notifySubscribers(table, newRecord);

		return { ...newRecord };
	}

	async update(
		table: string,
		id: string | number,
		data: Partial<T>,
	): Promise<T> {
		await this.simulateDelay();

		const tableData = this.mockData.get(table) || [];
		const index = tableData.findIndex((r) => r.id === id);

		if (index === -1) {
			throw this.createAdapterError(
				new Error("Record not found"),
				"Record not found",
			);
		}

		const updatedRecord = {
			...tableData[index],
			...data,
			id,
			updated_at: new Date().toISOString(),
		} as T;

		tableData[index] = updatedRecord;
		this.mockData.set(table, tableData);

		// Notify subscribers
		this.notifySubscribers(table, updatedRecord);

		return { ...updatedRecord };
	}

	async delete(table: string, id: string | number): Promise<void> {
		await this.simulateDelay();

		const tableData = this.mockData.get(table) || [];
		const index = tableData.findIndex((r) => r.id === id);

		if (index === -1) {
			throw this.createAdapterError(
				new Error("Record not found"),
				"Record not found",
			);
		}

		tableData.splice(index, 1);
		this.mockData.set(table, tableData);
	}

	// Test utility methods
	async simulateUpdate(table: string, record: T): Promise<void> {
		this.notifySubscribers(table, record);
	}

	async simulateConnectionError(): Promise<void> {
		const error = this.createAdapterError(
			new Error("Simulated connection error"),
			"Simulated connection error",
		);

		this.updateConnectionState({
			connected: false,
			connecting: false,
			error,
		});
	}

	getTableData(table: string): T[] {
		return [...(this.mockData.get(table) || [])];
	}

	setTableData(table: string, data: T[]): void {
		this.mockData.set(table, [...data]);
	}

	getSubscriberCount(): number {
		return this.subscribers.size;
	}

	private async simulateDelay(): Promise<void> {
		if (this.options.simulateNetworkLatency) {
			await new Promise((resolve) =>
				setTimeout(resolve, this.options.simulateNetworkLatency),
			);
		}
	}

	private notifySubscribers(table: string, record: T): void {
		for (const callback of this.subscribers.values()) {
			try {
				callback(record);
			} catch (err) {
				console.warn("Mock subscriber callback error:", err);
			}
		}
	}
}

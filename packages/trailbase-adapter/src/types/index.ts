/**
 * Core types for TrailBase adapter
 */

export interface AdapterError extends Error {
	status?: number;
	code?: string;
}

export interface ConnectionState {
	connected: boolean;
	connecting: boolean;
	error: AdapterError | null;
	lastConnected: Date | null;
	retryCount: number;
}

export interface ReconnectConfig {
	maxAttempts: number;
	baseDelay: number;
	maxDelay: number;
	jitter?: boolean;
}

export interface AdapterConfig {
	url: string;
	reconnect?: Partial<ReconnectConfig>;
	cache?: {
		enabled: boolean;
		ttl: number;
	};
}

// Generic data types that can be extended
export interface BaseRecord {
	id?: string | number;
	created_at?: string;
	updated_at?: string;
}

export type SubscriberCallback<T = unknown> = (data: T) => void;
export type ConnectionStateCallback = (state: ConnectionState) => void;
export type ErrorCallback = (error: AdapterError) => void;

// Event types for real-time updates
export interface StreamEvent<T = unknown> {
	type: 'insert' | 'update' | 'delete';
	table: string;
	record: T;
	old_record?: T;
}

// Subscription options
export interface SubscriptionOptions {
	table: string;
	filter?: Record<string, unknown>;
	select?: string[];
}

// Query options
export interface QueryOptions {
	filter?: Record<string, unknown>;
	order?: string[];
	limit?: number;
	offset?: number;
}

// Result types
export interface QueryResult<T> {
	records: T[];
	total?: number;
	has_more?: boolean;
}

// Adapter interface - can be implemented by different backends
export interface RealtimeAdapter<T = BaseRecord> {
	// Connection management
	connect(): Promise<void>;
	disconnect(): Promise<void>;
	reconnect(): Promise<void>;
	isConnected(): boolean;
	getConnectionState(): ConnectionState;

	// Subscription management
	subscribe(
		options: SubscriptionOptions,
		callback: SubscriberCallback<T>,
	): () => void;
	subscribeToConnectionState(
		callback: ConnectionStateCallback,
	): () => void;

	// Data operations
	findOne(table: string, id: string | number): Promise<T | null>;
	findMany(table: string, options?: QueryOptions): Promise<QueryResult<T>>;
	create(table: string, data: Partial<T>): Promise<T>;
	update(table: string, id: string | number, data: Partial<T>): Promise<T>;
	delete(table: string, id: string | number): Promise<void>;

	// Utility methods
	clearCache(): void;
	destroy(): Promise<void>;
}
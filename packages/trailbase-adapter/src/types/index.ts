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
	pagination?: {
		limit?: number;
		offset?: number;
	};
}

// Result types
export interface QueryResult<T> {
	records: T[];
	total?: number;
	has_more?: boolean;
}

// Authentication types
export interface AuthResult {
	user: User;
	token: string;
	refreshToken?: string;
}

export interface User {
	id: string;
	email: string;
	name?: string;
	avatar?: string;
	roles?: string[];
	created_at: string;
	updated_at: string;
}

export interface RegisterData {
	email: string;
	password: string;
	name?: string;
}

// Pagination types
export interface PaginatedResult<T> {
	records: T[];
	page: number;
	size: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

// Search options
export interface SearchOptions {
	query: string;
	fields: string[];
	limit?: number;
	offset?: number;
}

// Cache utilities interface
export interface CacheUtilities {
	warmCache(table: string, preloadQueries: QueryOptions[]): Promise<void>;
	invalidatePattern(pattern: string): void;
	getFromCache<T>(key: string): T | null;
	setCache<T>(key: string, data: T, ttl?: number): void;
	clearCache(): void;
	getCacheSize(): number;
	getCacheKeys(): string[];
	getCacheStats(): { size: number; keys: string[]; memoryUsage: string };
	invalidateTable(table: string): void;
	preloadCommonQueries(table: string): Promise<void>;
}

// Auth adapter interface
export interface AuthAdapter {
	login(email: string, password: string): Promise<AuthResult>;
	logout(): Promise<void>;
	register(userData: RegisterData): Promise<AuthResult>;
	getCurrentUser(): Promise<User | null>;
	refreshToken(): Promise<void>;
	isAuthenticated(): boolean;
}

// Record utilities interface
export interface RecordUtilities<T = BaseRecord> {
	// Pagination helper
	paginate(table: string, page: number, size: number, options?: QueryOptions): Promise<PaginatedResult<T>>;
	
	// Search functionality
	search(table: string, searchOptions: SearchOptions): Promise<T[]>;
	
	// Additional utility methods
	count(table: string, filter?: Record<string, unknown>): Promise<number>;
	exists(table: string, filter: Record<string, unknown>): Promise<boolean>;
	findFirst(table: string, options?: QueryOptions): Promise<T | null>;
	findLast(table: string, orderBy?: string, options?: QueryOptions): Promise<T | null>;
	getRecent(table: string, limit?: number, orderBy?: string): Promise<T[]>;
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

	// New utility interfaces
	auth?: AuthAdapter;
	records?: RecordUtilities<T>;
	cacheUtils?: CacheUtilities;
}
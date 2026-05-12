/**
 * Internal TrailBase client shapes used by the adapter utilities.
 */

import type { BaseRecord, QueryOptions } from '../types/index.js';

export interface TrailBaseEvent {
	Update?: unknown;
	Insert?: unknown;
	Delete?: unknown;
	Error?: string;
}

export interface TrailBaseListResult<T extends BaseRecord> {
	records?: T[];
	total?: number;
	has_more?: boolean;
}

export interface TrailBaseRecordApi<T extends BaseRecord> {
	tableName?: string;
	subscribe(channel: string): Promise<ReadableStream<TrailBaseEvent>>;
	read(id: string): Promise<T | null>;
	list(params: QueryOptions): Promise<TrailBaseListResult<T>>;
	create(data: Partial<T>): Promise<T>;
	update(id: string, data: Partial<T>): Promise<T>;
	delete(id: string): Promise<void>;
}

export interface TrailBaseClient<T extends BaseRecord> {
	records(table: string): TrailBaseRecordApi<T>;
}

/**
 * Record utilities for enhanced TrailBase operations
 */

import type { 
	RecordUtilities, 
	PaginatedResult, 
	SearchOptions, 
	QueryOptions, 
	BaseRecord,
	AdapterError 
} from '../types/index.js';
import type { TrailBaseClient } from './client-types.js';

export class TrailBaseRecordUtilities<T extends BaseRecord = BaseRecord> implements RecordUtilities<T> {
	private client: TrailBaseClient<T>;

	constructor(client: TrailBaseClient<T>) {
		this.client = client;
	}

	async paginate(
		table: string, 
		page: number, 
		size: number, 
		options: QueryOptions = {}
	): Promise<PaginatedResult<T>> {
		try {
			if (!this.client) {
				throw new Error('TrailBase client not initialized');
			}

			// Calculate offset
			const offset = (page - 1) * size;

			// Build query params
			const queryParams: QueryOptions = {
				...options,
				pagination: {
					limit: size,
					offset: offset,
				},
			};

			const api = this.client.records(table);
			const response = await api.list(queryParams);

			// Calculate pagination metadata
			const total = response.total || 0;
			const totalPages = Math.ceil(total / size);

			const result: PaginatedResult<T> = {
				records: (response.records || []) as T[],
				page,
				size,
				total,
				totalPages,
				hasNext: page < totalPages,
				hasPrev: page > 1,
			};

			return result;
		} catch (error) {
			throw this.createUtilityError(error, `Failed to paginate ${table}`);
		}
	}

	async search(table: string, searchOptions: SearchOptions): Promise<T[]> {
		try {
			if (!this.client) {
				throw new Error('TrailBase client not initialized');
			}

			const { query, fields, limit = 50, offset = 0 } = searchOptions;

			// Build search filter for multiple fields
			const searchFilters = fields.map(field => ({
				[field]: { $like: `%${query}%` }
			}));

			// Combine filters with OR logic
			const filter = searchFilters.length > 1 
				? { $or: searchFilters }
				: searchFilters[0];

			const queryParams: QueryOptions = {
				filter,
				pagination: {
					limit,
					offset,
				},
			};

			const api = this.client.records(table);
			const response = await api.list(queryParams);

			return (response.records || []) as T[];
		} catch (error) {
			throw this.createUtilityError(error, `Failed to search ${table}`);
		}
	}

	// Additional utility methods
	async count(table: string, filter?: Record<string, unknown>): Promise<number> {
		try {
			if (!this.client) {
				throw new Error('TrailBase client not initialized');
			}

			const queryParams: QueryOptions = {
				pagination: { limit: 0 }, // Just get the count
			};

			if (filter) {
				queryParams.filter = filter;
			}

			const api = this.client.records(table);
			const response = await api.list(queryParams);

			return response.total || 0;
		} catch (error) {
			throw this.createUtilityError(error, `Failed to count records in ${table}`);
		}
	}

	async exists(table: string, filter: Record<string, unknown>): Promise<boolean> {
		try {
			const count = await this.count(table, filter);
			return count > 0;
		} catch (error) {
			throw this.createUtilityError(error, `Failed to check existence in ${table}`);
		}
	}

	async findFirst(table: string, options: QueryOptions = {}): Promise<T | null> {
		try {
			if (!this.client) {
				throw new Error('TrailBase client not initialized');
			}

			const queryParams: QueryOptions = {
				...options,
				pagination: { limit: 1 },
			};

			const api = this.client.records(table);
			const response = await api.list(queryParams);

			const records = response.records || [];
			return records.length > 0 ? records[0] as T : null;
		} catch (error) {
			throw this.createUtilityError(error, `Failed to find first record in ${table}`);
		}
	}

	async findLast(table: string, orderBy: string = 'created_at', options: QueryOptions = {}): Promise<T | null> {
		try {
			const queryOptions: QueryOptions = {
				...options,
				order: [`-${orderBy}`], // Descending order
			};

			return await this.findFirst(table, queryOptions);
		} catch (error) {
			throw this.createUtilityError(error, `Failed to find last record in ${table}`);
		}
	}

	async getRecent(table: string, limit: number = 10, orderBy: string = 'created_at'): Promise<T[]> {
		try {
			if (!this.client) {
				throw new Error('TrailBase client not initialized');
			}

			const queryParams: QueryOptions = {
				order: [`-${orderBy}`],
				pagination: { limit },
			};

			const api = this.client.records(table);
			const response = await api.list(queryParams);

			return (response.records || []) as T[];
		} catch (error) {
			throw this.createUtilityError(error, `Failed to get recent records from ${table}`);
		}
	}

	// Helper method for creating utility errors
	private createUtilityError(error: unknown, message: string): AdapterError {
		const utilityError: AdapterError = new Error(message);
		
		if (error && typeof error === 'object') {
			const err = error as {
				status?: unknown;
				statusCode?: unknown;
				code?: unknown;
				message?: unknown;
			};
			utilityError.status =
				typeof err.status === 'number'
					? err.status
					: typeof err.statusCode === 'number'
						? err.statusCode
						: 500;
			utilityError.code =
				typeof err.code === 'string' ? err.code : 'UTILITY_ERROR';
			
			if (typeof err.message === 'string') {
				utilityError.message = `${message}: ${err.message}`;
			}
		}
		
		utilityError.name = 'AdapterError';
		return utilityError;
	}
}

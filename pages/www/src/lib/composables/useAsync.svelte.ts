/**
 * Composable for managing async operations with loading states and error handling
 * Provides consistent patterns for data fetching across components
 */

import type { AppError, LoadingState } from "$lib/types";
import { logError, toAppError } from "$lib/utils/error-handling";

interface AsyncOptions<T> {
	/** Initial data value */
	initialData?: T | null;
	/** Whether to execute immediately on creation */
	immediate?: boolean;
	/** Callback when operation succeeds */
	onSuccess?: (data: T) => void;
	/** Callback when operation fails */
	onError?: (error: AppError) => void;
	/** Callback when operation completes (success or failure) */
	onComplete?: () => void;
}

interface AsyncState<T> {
	/** Current data value */
	readonly data: T | null;
	/** Loading state with error information */
	readonly loading: LoadingState;
	/** Whether any operation has been attempted */
	readonly hasAttempted: boolean;
	/** Last successful execution timestamp */
	readonly lastSuccess: Date | null;
	/** Last error that occurred */
	readonly lastError: AppError | null;
}

interface AsyncActions<T> {
	/** Execute the async operation */
	execute: (...args: unknown[]) => Promise<T>;
	/** Reset to initial state */
	reset: () => void;
	/** Set data manually */
	setData: (data: T | null) => void;
	/** Clear any errors */
	clearError: () => void;
	/** Refresh (re-execute with last arguments) */
	refresh: () => Promise<T | null>;
}

/**
 * Create an async operation manager
 */
export function useAsync<T>(
	asyncFunction: (...args: unknown[]) => Promise<T>,
	options: AsyncOptions<T> = {},
): [AsyncState<T>, AsyncActions<T>] {
	const {
		initialData = null,
		immediate = false,
		onSuccess,
		onError,
		onComplete,
	} = options;

	// Internal state
	let data = $state<T | null>(initialData);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let hasAttempted = $state(false);
	let lastSuccess = $state<Date | null>(null);
	let lastError = $state<AppError | null>(null);
	let lastArgs = $state<unknown[]>([]);

	// Computed loading state
	const loading: LoadingState = $derived({
		isLoading,
		error,
		loadingMessage: undefined,
	});

	// Computed state object
	const state: AsyncState<T> = $derived({
		data,
		loading,
		hasAttempted,
		lastSuccess,
		lastError,
	});

	// Execute the async operation
	const execute = async (...args: unknown[]): Promise<T> => {
		try {
			// Update state
			isLoading = true;
			error = null;
			hasAttempted = true;
			lastArgs = args;

			// Execute the function
			const result = await asyncFunction(...args);

			// Success
			data = result;
			lastSuccess = new Date();
			lastError = null;

			// Call success callback
			if (onSuccess) {
				onSuccess(result);
			}

			return result;
		} catch (err) {
			// Handle error
			const appError = toAppError(err);
			error = appError.message;
			lastError = appError;

			// Log error
			logError(appError, "useAsync");

			// Call error callback
			if (onError) {
				onError(appError);
			}

			throw appError;
		} finally {
			isLoading = false;

			// Call complete callback
			if (onComplete) {
				onComplete();
			}
		}
	};

	// Reset to initial state
	const reset = () => {
		data = initialData;
		isLoading = false;
		error = null;
		hasAttempted = false;
		lastSuccess = null;
		lastError = null;
		lastArgs = [];
	};

	// Set data manually
	const setData = (newData: T | null) => {
		data = newData;
		error = null;
		lastError = null;
	};

	// Clear any errors
	const clearError = () => {
		error = null;
		lastError = null;
	};

	// Refresh with last arguments
	const refresh = async (): Promise<T | null> => {
		if (lastArgs.length > 0) {
			return execute(...lastArgs);
		}
		return null;
	};

	// Actions object
	const actions: AsyncActions<T> = {
		execute,
		reset,
		setData,
		clearError,
		refresh,
	};

	// Execute immediately if requested
	if (immediate) {
		execute();
	}

	return [state, actions];
}

/**
 * Specialized hook for API calls with automatic retry
 */
export function useApiCall<T>(
	apiFunction: (...args: unknown[]) => Promise<T>,
	options: AsyncOptions<T> & {
		/** Number of retry attempts */
		retries?: number;
		/** Retry delay in milliseconds */
		retryDelay?: number;
	} = {},
): [AsyncState<T>, AsyncActions<T>] {
	const { retries = 2, retryDelay = 1000, ...asyncOptions } = options;

	const wrappedFunction = async (...args: unknown[]): Promise<T> => {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				return await apiFunction(...args);
			} catch (err) {
				lastError = err instanceof Error ? err : new Error(String(err));

				// Don't retry on the last attempt
				if (attempt === retries) {
					break;
				}

				// Wait before retrying
				if (retryDelay > 0) {
					await new Promise((resolve) => setTimeout(resolve, retryDelay));
				}
			}
		}

		throw lastError;
	};

	return useAsync(wrappedFunction, asyncOptions);
}

/**
 * Hook for managing paginated data
 */
export function usePagination<T>(
	fetchFunction: (
		page: number,
		limit: number,
	) => Promise<{ items: T[]; total: number; hasMore: boolean }>,
	options: {
		initialPage?: number;
		pageSize?: number;
		immediate?: boolean;
	} = {},
) {
	const { initialPage = 1, pageSize = 10, immediate = true } = options;

	let currentPage = $state(initialPage);
	let totalItems = $state(0);
	let hasMore = $state(false);
	let allItems = $state<T[]>([]);

	const [state, actions] = useAsync(
		async (page: number, limit: number) => {
			const result = await fetchFunction(page, limit);
			return result;
		},
		{
			immediate: false,
			onSuccess: (result) => {
				if (currentPage === 1) {
					// First page - replace all items
					allItems = result.items;
				} else {
					// Subsequent pages - append items
					allItems = [...allItems, ...result.items];
				}

				totalItems = result.total;
				hasMore = result.hasMore;
			},
		},
	);

	const loadPage = async (page: number) => {
		currentPage = page;
		return actions.execute(page, pageSize);
	};

	const loadMore = async () => {
		if (hasMore && !state.loading.isLoading) {
			return loadPage(currentPage + 1);
		}
		return null;
	};

	const resetPagination = () => {
		currentPage = initialPage;
		totalItems = 0;
		hasMore = false;
		allItems = [];
		actions.reset();
	};

	// Load initial page
	if (immediate) {
		loadPage(initialPage);
	}

	return {
		// State
		items: $derived(allItems),
		currentPage: $derived(currentPage),
		totalItems: $derived(totalItems),
		hasMore: $derived(hasMore),
		loading: $derived(state.loading),

		// Actions
		loadPage,
		loadMore,
		reset: resetPagination,
		refresh: () => loadPage(currentPage),
	};
}

// @ts-nocheck
/**
 * Comprehensive type definitions for the lotto application
 * Strict typing for better type safety and IDE support
 */

// ============= Core Lotto Types =============

/** Valid lotto numbers (1-45) */
export type LottoNumber =
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| 13
	| 14
	| 15
	| 16
	| 17
	| 18
	| 19
	| 20
	| 21
	| 22
	| 23
	| 24
	| 25
	| 26
	| 27
	| 28
	| 29
	| 30
	| 31
	| 32
	| 33
	| 34
	| 35
	| 36
	| 37
	| 38
	| 39
	| 40
	| 41
	| 42
	| 43
	| 44
	| 45;

/** Valid round numbers (positive integers) */
export type RoundNumber = number & { readonly __brand: unique symbol };

/** Create a branded round number with runtime validation */
export function createRoundNumber(value: number): RoundNumber {
	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(
			`Invalid round number: ${value}. Must be a positive integer.`,
		);
	}
	return value as RoundNumber;
}

/** Valid lotto number with runtime validation */
export function createLottoNumber(value: number): LottoNumber {
	if (!Number.isInteger(value) || value < 1 || value > 45) {
		throw new Error(
			`Invalid lotto number: ${value}. Must be between 1 and 45.`,
		);
	}
	return value as LottoNumber;
}

/** Six main lotto numbers */
export type LottoNumbers = readonly [
	LottoNumber,
	LottoNumber,
	LottoNumber,
	LottoNumber,
	LottoNumber,
	LottoNumber,
];

/** Complete lotto draw result */
export interface LottoDrawResult {
	readonly round: RoundNumber;
	readonly drawDate: string; // ISO date string
	readonly numbers: LottoNumbers;
	readonly bonusNumber: LottoNumber;
	readonly firstPrizeAmount: number;
	readonly firstPrizeWinnerCount: number;
	readonly totalSalesAmount: number;
}

// ============= Statistics Types =============

/** Color categories for lotto balls */
export type BallColor = "yellow" | "blue" | "red" | "grey" | "green";

/** Number sections (1-10, 11-20, etc.) */
export type NumberSection = 1 | 2 | 3 | 4 | 5;

/** Odd/Even analysis types */
export type NumberParity = "odd" | "even";

/** High/Low analysis types */
export type NumberRange = "low" | "high";

/** AC (Adjacent Coefficient) value range */
export type ACValue = number & { readonly __acBrand: unique symbol };

export function createACValue(value: number): ACValue {
	if (!Number.isInteger(value) || value < 0 || value > 28) {
		throw new Error(`Invalid AC value: ${value}. Must be between 0 and 28.`);
	}
	return value as ACValue;
}

// ============= API Response Types =============

/** Generic API response wrapper */
export interface ApiResponse<T> {
	readonly success: boolean;
	readonly data: T | null;
	readonly error: string | null;
	readonly timestamp: string;
}

/** Success response */
export interface ApiSuccessResponse<T> extends ApiResponse<T> {
	readonly success: true;
	readonly data: T;
	readonly error: null;
}

/** Error response */
export interface ApiErrorResponse extends ApiResponse<never> {
	readonly success: false;
	readonly data: null;
	readonly error: string;
}

/** Type guard for successful API responses */
export function isApiSuccessResponse<T>(
	response: ApiResponse<T>,
): response is ApiSuccessResponse<T> {
	return response.success && response.data !== null;
}

// ============= Component Props Types =============

/** Generic loading state */
export interface LoadingState {
	readonly isLoading: boolean;
	readonly error: string | null;
	readonly loadingMessage?: string;
}

/** Pagination configuration */
export interface PaginationConfig {
	readonly currentPage: number;
	readonly pageSize: number;
	readonly totalItems: number;
	readonly hasNextPage: boolean;
	readonly hasPreviousPage: boolean;
}

/** Sort configuration */
export interface SortConfig<T extends string = string> {
	readonly field: T;
	readonly direction: "asc" | "desc";
}

/** Generic table data with metadata */
export interface TableData<T> {
	readonly items: readonly T[];
	readonly pagination: PaginationConfig;
	readonly sort: SortConfig;
	readonly loading: LoadingState;
}

// ============= Statistics Analysis Types =============

/** Number frequency analysis */
export interface NumberFrequency {
	readonly number: LottoNumber;
	readonly drawCount: number;
	readonly bonusCount: number;
	readonly lastDrawRound: RoundNumber | null;
	readonly frequency: number; // Percentage
}

/** Color distribution analysis */
export interface ColorDistribution
	extends Record<
		BallColor,
		{
			readonly count: number;
			readonly average: number;
			readonly percentage: number;
		}
	> {}

/** Section analysis */
export interface SectionAnalysis
	extends Record<
		`section_${NumberSection}`,
		{
			readonly count: number;
			readonly average: number;
			readonly percentage: number;
		}
	> {}

/** Odd/Even analysis */
export interface OddEvenAnalysis {
	readonly oddCount: number;
	readonly evenCount: number;
	readonly ratio: string; // "3:3", "4:2", etc.
	readonly isBalanced: boolean;
}

/** High/Low analysis */
export interface HighLowAnalysis {
	readonly lowCount: number; // 1-22
	readonly highCount: number; // 23-45
	readonly ratio: string;
	readonly isBalanced: boolean;
}

// ============= Form Types =============

/** Form validation result */
export interface ValidationResult {
	readonly isValid: boolean;
	readonly errors: readonly string[];
}

/** Generic form state */
export interface FormState<T> {
	readonly data: T;
	readonly validation: ValidationResult;
	readonly isSubmitting: boolean;
	readonly submitError: string | null;
}

// ============= Utility Types =============

/** Make all properties required and readonly recursively */
export type DeepReadonly<T> = {
	readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/** Extract keys of a type that match a specific value type */
export type KeysOfType<T, U> = {
	[K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/** Create a type with optional properties from a union of keys */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Create a type with required properties from a union of keys */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
	Required<Pick<T, K>>;

// ============= Error Types =============

/** Application error categories */
export type ErrorCategory =
	| "validation"
	| "network"
	| "authentication"
	| "authorization"
	| "not_found"
	| "server_error"
	| "client_error"
	| "unknown";

/** Structured application error */
export interface AppError {
	readonly category: ErrorCategory;
	readonly message: string;
	readonly code?: string;
	readonly details?: Record<string, unknown>;
	readonly timestamp: string;
}

/** Create a structured error */
export function createAppError(
	category: ErrorCategory,
	message: string,
	code?: string,
	details?: Record<string, unknown>,
): AppError {
	return {
		category,
		message,
		timestamp: new Date().toISOString(),
		...(code !== undefined && { code }),
		...(details !== undefined && { details }),
	};
}

// ============= Event Types =============

/** Custom event types for components */
export interface CustomEvents {
	"number-select": { number: LottoNumber };
	"round-select": { round: RoundNumber };
	"filter-change": { filters: Record<string, unknown> };
	"sort-change": { sort: SortConfig };
	"page-change": { page: number };
}

/** Generic event handler type */
export type EventHandler<T extends keyof CustomEvents> = (
	event: CustomEvent<CustomEvents[T]>,
) => void;

// ============= TrailBase Integration Types =============

/** TrailBase record with metadata */
export interface TrailBaseRecord<T = Record<string, unknown>> {
	readonly id: string;
	readonly created_at: string;
	readonly updated_at: string;
	readonly data: T;
}

/** TrailBase query options */
export interface TrailBaseQueryOptions {
	readonly filter?: string;
	readonly order?: readonly string[];
	readonly limit?: number;
	readonly offset?: number;
}

/** TrailBase response with pagination */
export interface TrailBaseResponse<T> {
	readonly records: readonly T[];
	readonly total_count?: number;
	readonly has_more?: boolean;
}

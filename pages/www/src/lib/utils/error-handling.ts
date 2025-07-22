/**
 * Centralized error handling utilities
 * Provides consistent error processing, logging, and user-friendly messages
 */

import type { AppError, ErrorCategory } from '$lib/types';
import { createAppError } from '$lib/types';

// ============= Error Classification =============

/** Classify an unknown error into appropriate category */
export function classifyError(error: unknown): ErrorCategory {
  if (error instanceof TypeError) return 'client_error';
  if (error instanceof ReferenceError) return 'client_error';
  
  // Network-related errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'authentication';
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return 'authorization';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not_found';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('500') || message.includes('server')) {
      return 'server_error';
    }
  }
  
  return 'unknown';
}

/** Extract error message from various error types */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return '알 수 없는 오류가 발생했습니다.';
}

// ============= Error Creation Helpers =============

/** Create a validation error */
export function createValidationError(message: string, field?: string): AppError {
  return createAppError('validation', message, 'VALIDATION_ERROR', field ? { field } : undefined);
}

/** Create a network error */
export function createNetworkError(message: string = '네트워크 연결을 확인해주세요.'): AppError {
  return createAppError('network', message, 'NETWORK_ERROR');
}

/** Create an authentication error */
export function createAuthError(message: string = '인증이 필요합니다.'): AppError {
  return createAppError('authentication', message, 'AUTH_ERROR');
}

/** Create a not found error */
export function createNotFoundError(resource: string): AppError {
  return createAppError('not_found', `${resource}를 찾을 수 없습니다.`, 'NOT_FOUND_ERROR', { resource });
}

/** Create a server error */
export function createServerError(message: string = '서버에서 오류가 발생했습니다.'): AppError {
  return createAppError('server_error', message, 'SERVER_ERROR');
}

// ============= Error Conversion =============

/** Convert unknown error to structured AppError */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  
  const category = classifyError(error);
  const message = extractErrorMessage(error);
  
  return createAppError(category, message, undefined, { originalError: String(error) });
}

/** Type guard for AppError */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'category' in error &&
    'message' in error &&
    'timestamp' in error
  );
}

// ============= User-Friendly Messages =============

/** Get user-friendly error message based on category and context */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.category) {
    case 'validation':
      return error.message; // Validation messages are already user-friendly
    
    case 'network':
      return '인터넷 연결을 확인하고 다시 시도해주세요.';
    
    case 'authentication':
      return '로그인이 필요합니다. 다시 로그인해주세요.';
    
    case 'authorization':
      return '접근 권한이 없습니다.';
    
    case 'not_found':
      return error.details?.resource 
        ? `요청하신 ${error.details.resource}를 찾을 수 없습니다.`
        : '요청하신 페이지를 찾을 수 없습니다.';
    
    case 'server_error':
      return '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
    
    case 'client_error':
      return '잘못된 요청입니다. 페이지를 새로고침 후 다시 시도해주세요.';
    
    default:
      return '예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
}

// ============= Error Logging =============

/** Log error with appropriate level based on category */
export function logError(error: AppError, context?: string): void {
  const logMessage = context 
    ? `[${context}] ${error.category}: ${error.message}`
    : `${error.category}: ${error.message}`;
  
  // Use different console methods based on severity
  switch (error.category) {
    case 'validation':
    case 'not_found':
      console.warn(logMessage, error.details);
      break;
    
    case 'server_error':
    case 'unknown':
      console.error(logMessage, error.details);
      break;
    
    default:
      console.info(logMessage, error.details);
  }
}

// ============= Error Handling Decorators =============

/** Async error handler wrapper for consistent error processing */
export function withErrorHandling<T extends readonly unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
): (...args: T) => Promise<R | never> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = toAppError(error);
      logError(appError, context);
      throw appError;
    }
  };
}

/** Sync error handler wrapper */
export function withSyncErrorHandling<T extends readonly unknown[], R>(
  fn: (...args: T) => R,
  context?: string
): (...args: T) => R | never {
  return (...args: T) => {
    try {
      return fn(...args);
    } catch (error) {
      const appError = toAppError(error);
      logError(appError, context);
      throw appError;
    }
  };
}

// ============= Retry Logic =============

/** Retry configuration */
export interface RetryConfig {
  readonly maxAttempts: number;
  readonly baseDelay: number; // milliseconds
  readonly maxDelay: number; // milliseconds
  readonly backoffMultiplier: number;
  readonly retryableCategories: readonly ErrorCategory[];
}

/** Default retry configuration */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableCategories: ['network', 'server_error'],
};

/** Execute function with retry logic */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const {
    maxAttempts,
    baseDelay,
    maxDelay,
    backoffMultiplier,
    retryableCategories,
  } = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  let lastError: AppError | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const appError = toAppError(error);
      lastError = appError;
      
      // Don't retry if this is the last attempt or error is not retryable
      if (attempt === maxAttempts || !retryableCategories.includes(appError.category)) {
        throw appError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      logError(appError, `Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`);
    }
  }
  
  throw lastError!;
}

// ============= Error Boundary Utilities =============

/** Extract component name from error stack for better debugging */
export function extractComponentFromStack(error: Error): string | null {
  const stack = error.stack;
  if (!stack) return null;
  
  // Look for Svelte component patterns in stack trace
  const svelteComponentMatch = stack.match(/(\w+\.svelte)/);
  return svelteComponentMatch ? svelteComponentMatch[1] : null;
}

/** Format error for development vs production */
export function formatErrorForEnvironment(error: AppError, isDevelopment: boolean): string {
  if (isDevelopment) {
    return `[${error.category.toUpperCase()}] ${error.message}${
      error.details ? `\nDetails: ${JSON.stringify(error.details, null, 2)}` : ''
    }`;
  }
  
  return getUserFriendlyMessage(error);
}
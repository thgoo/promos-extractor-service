/**
 * Retry Utility with Exponential Backoff
 * Automatically retries failed operations with increasing delays
 */

import { AIAPIError } from '../types';

export interface RetryConfig {
  maxAttempts: number;        // Maximum number of retry attempts
  initialDelayMs: number;     // Initial delay in milliseconds
  maxDelayMs: number;         // Maximum delay cap
  backoffMultiplier: number;  // Multiplier for exponential backoff
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,      // 1 second
  maxDelayMs: 10000,         // 10 seconds
  backoffMultiplier: 2,      // Double each time
};

/**
 * Check if an error is retryable (temporary)
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof AIAPIError)) {
    return false;
  }

  const { statusCode } = error;

  if (!statusCode) return false;

  // Retry on timeout
  if (statusCode === 408) return true;

  // Retry on rate limit
  if (statusCode === 429) return true;

  // Retry on server errors (5xx)
  if (statusCode >= 500 && statusCode < 600) return true;

  // Retry on network errors (statusCode = 0)
  if (statusCode === 0) return true;

  // Don't retry on client errors (4xx except 408, 429)
  return false;
}

/**
 * Calculate delay for next retry attempt using exponential backoff
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig,
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 *
 * @param operation - Async function to retry
 * @param config - Retry configuration
 * @returns Result of the operation
 * @throws Last error if all retries fail
 *
 * @example
 * const result = await withRetry(
 *   async () => await fetchAPI(),
 *   { maxAttempts: 3, initialDelayMs: 1000 }
 * );
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // If not retryable or last attempt, throw immediately
      if (!isRetryableError(error) || attempt === finalConfig.maxAttempts) {
        throw error;
      }

      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, finalConfig);

      // Log retry attempt (can be integrated with logger later)
      if (error instanceof AIAPIError) {
        // eslint-disable-next-line no-console
        console.debug(`Retry attempt ${attempt}/${finalConfig.maxAttempts} after ${delay}ms (error: ${error.message})`);
      }

      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Retry configuration presets
 */
export const RETRY_PRESETS = {
  /**
   * Fast retry for quick operations
   * 3 attempts: 500ms, 1s, 2s
   */
  FAST: {
    maxAttempts: 3,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  } as RetryConfig,

  /**
   * Standard retry for most operations
   * 3 attempts: 1s, 2s, 4s
   */
  STANDARD: DEFAULT_RETRY_CONFIG,

  /**
   * Aggressive retry for critical operations
   * 5 attempts: 1s, 2s, 4s, 8s, 16s
   */
  AGGRESSIVE: {
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 16000,
    backoffMultiplier: 2,
  } as RetryConfig,
} as const;

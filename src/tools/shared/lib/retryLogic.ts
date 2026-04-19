import type { ApiErrorPayload, RetryMeta } from '../types/tool.types';

export const RETRY_MAX_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 900;
export const RETRY_JITTER_MS = 350;

export class RetryableRequestError extends Error {
  retryable = true;
}

export function getRetryMeta(
  responseStatus: number,
  payload: ApiErrorPayload | null,
): RetryMeta {
  const code = payload?.error?.code;
  const reason = payload?.error?.details?.reason;
  const isQuotaExhausted = responseStatus === 429 && reason === 'quota_exhausted';
  const retryable =
    !isQuotaExhausted &&
    (responseStatus >= 500 ||
      responseStatus === 429 ||
      code === 'INTERNAL_ERROR' ||
      code === 'RATE_LIMIT_EXCEEDED');

  return { retryable };
}

export function getBackoffDelayMs(attempt: number): number {
  const jitter = Math.floor(Math.random() * RETRY_JITTER_MS);
  return RETRY_BASE_DELAY_MS * (2 ** (attempt - 1)) + jitter;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withRetry<T>(
  action: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    onRetry?: (
      attempt: number,
      maxAttempts: number,
      delayMs: number,
      errorMessage: string,
    ) => void;
  },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? RETRY_MAX_ATTEMPTS;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      const retryable = error instanceof RetryableRequestError;

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = getBackoffDelayMs(attempt);
      options?.onRetry?.(
        attempt,
        maxAttempts,
        delayMs,
        error instanceof Error ? error.message : 'Errore temporaneo',
      );
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Operazione fallita');
}

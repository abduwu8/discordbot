import { logger } from '../utils/logger.js';
import { gatewayState } from './gatewayWatch.js';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return /429|rate limit/i.test(String(error));
  }

  const candidate = error as {
    status?: number;
    statusCode?: number;
    httpStatus?: number;
    message?: string;
  };

  return (
    candidate.status === 429 ||
    candidate.statusCode === 429 ||
    candidate.httpStatus === 429 ||
    /429|rate limit/i.test(candidate.message ?? String(error))
  );
}

function waitMsFromError(error: unknown): number {
  if (error && typeof error === 'object' && 'retryAfter' in error) {
    const retryAfter = (error as { retryAfter?: number }).retryAfter;
    if (typeof retryAfter === 'number' && Number.isFinite(retryAfter) && retryAfter > 0) {
      return Math.min(Math.ceil(retryAfter * 1000), 60 * 60 * 1000);
    }
  }

  return 15 * 60 * 1000;
}

export async function loginWithBackoff(
  login: () => Promise<string>,
  isShuttingDown: () => boolean,
): Promise<void> {
  let delayMs = 30_000;

  while (!isShuttingDown()) {
    try {
      await login();
      gatewayState.rateLimitedUntil = 0;
      return;
    } catch (error: unknown) {
      const waitMs = isRateLimitError(error) ? waitMsFromError(error) : delayMs;
      gatewayState.rateLimitedUntil = Date.now() + waitMs;
      logger.error(
        `Discord login failed; waiting ${Math.round(waitMs / 1000)}s before retry (do not restart the service):`,
        error,
      );
      await sleep(waitMs);
      delayMs = Math.min(delayMs * 2, 30 * 60 * 1000);
    }
  }
}

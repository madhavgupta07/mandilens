/**
 * In-memory rate limiter.
 *
 * Single-instance only: it resets on deploy and is not shared between
 * processes. That is an acceptable trade-off for abuse-prone endpoints
 * (login, registration, the AI assistant, imports) and is documented in the
 * README. Swap the store for Redis/Mongo for multi-instance deployments.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

export function clientKey(headers: Headers, scope: string, extra?: string): string {
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
  return `${scope}:${ip}${extra ? `:${extra}` : ""}`;
}

/** Test helper — clears all buckets. */
export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Tiny in-memory rate limiter keyed by IP + bucket.
 *
 * Free-tier hosting sleeps when idle, so we'd lose state on every cold boot
 * anyway. That's fine — anti-spam is the goal here, not bulletproof.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

interface RateLimitOptions {
  windowMs: number;  // sliding window length
  max: number;       // max requests in the window
}

/**
 * Returns { allowed, retryAfterMs }. If `allowed` is false the caller should
 * reject the request (e.g. throw a TRPCError TOO_MANY_REQUESTS).
 */
export function rateLimit(key: string, opts: RateLimitOptions) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true as const, retryAfterMs: 0 };
  }

  if (existing.count >= opts.max) {
    return { allowed: false as const, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true as const, retryAfterMs: 0 };
}

// Garbage-collect old buckets every minute to stop the map growing forever
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}, 60_000).unref?.();

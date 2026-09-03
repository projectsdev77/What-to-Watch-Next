/**
 * In-memory fixed-window rate limiter — deliberately simple, MVP-level
 * protection against basic abuse (credential stuffing, signup spam,
 * password-reset email-bombing), not a hardened defense.
 *
 * IMPORTANT: this only works within a single running process. Supabase
 * itself has some built-in auth rate limiting server-side, but this adds
 * an application-level layer with messaging we control. In a
 * serverless/multi-instance production deployment (e.g. Vercel), each
 * instance has its own separate memory, so counts are NOT shared across
 * instances — a determined attacker distributing requests across
 * instances would bypass this. For real protection at production scale,
 * swap this for a shared store — Upstash Redis has a generous free tier
 * and a drop-in @upstash/ratelimit package built for exactly this;
 * checkRateLimit()'s signature below is the only thing call sites
 * depend on, so that's the one place that would need to change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so a flood of distinct keys (e.g. many different
// emails) can't grow this map unboundedly — swept lazily rather than on
// a timer, since Server Functions don't have a persistent background
// process to run one in.
const MAX_TRACKED_KEYS = 10_000;

function sweepExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** `key` should already include whatever it's scoped to (action + email/IP/etc). */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (buckets.size > MAX_TRACKED_KEYS) sweepExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Small in-memory sliding-window rate limiter.
 *
 * Honest limitation: state lives in the memory of one server process. That is correct for a
 * single Render instance (the free tier) and gives only per-instance protection if the app is
 * scaled horizontally; swap the Map for a shared store (for example a Postgres table or Redis)
 * at that point. The database enforces its own per-phone cap on top of this (see
 * clinics.max_active_bookings_per_phone), which holds regardless of instance count.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  sweep(now, windowMs);
  const bucket = buckets.get(key) ?? { hits: [] };
  const cutoff = now - windowMs;
  bucket.hits = bucket.hits.filter((time) => time > cutoff);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? now;
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

function sweep(now: number, windowMs: number) {
  // Drop stale buckets at most once a minute so memory cannot grow without bound.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    const newest = bucket.hits[bucket.hits.length - 1];
    if (newest === undefined || newest <= now - windowMs) buckets.delete(key);
  }
}

export function resetRateLimits(): void {
  buckets.clear();
  lastSweep = 0;
}

/**
 * Best-effort client address from the proxy headers. On Render the platform proxy sets
 * x-forwarded-for; the left-most entry is the original client. This is spoofable when the app is
 * exposed without a trusted proxy, so it is a spam deterrent, not a security boundary.
 */
export function clientIpFrom(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim();
  return candidate && candidate.length <= 64 ? candidate : "unknown";
}

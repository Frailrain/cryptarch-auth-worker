// Per-IP fixed-window counter, isolate-local. Acceptable for v1 scale per
// brief — Cloudflare runs many isolates so the effective limit is a soft
// upper bound, not a precise global count. If we outgrow this, swap for
// the Rate Limiting binding without touching the call site.

const WINDOW_MS = 60_000;
const LIMIT = 60;

interface Bucket {
  count: number;
  windowStart: number;
}

const BUCKETS = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
}

export function checkRateLimit(ip: string, now: number = Date.now()): RateLimitResult {
  const bucket = BUCKETS.get(ip);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    BUCKETS.set(ip, { count: 1, windowStart: now });
    return { allowed: true, count: 1, limit: LIMIT };
  }
  bucket.count += 1;
  return { allowed: bucket.count <= LIMIT, count: bucket.count, limit: LIMIT };
}

export function __resetRateLimitForTests(): void {
  BUCKETS.clear();
}

export const RATE_LIMIT_CONFIG = { WINDOW_MS, LIMIT } as const;

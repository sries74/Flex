export interface RateLimiter {
  check(key: string): { allowed: true } | { allowed: false; retryAfterSec: number };
  size(): number;
}

/**
 * Sliding-window limiter, in memory. Fine for one API instance (our VPS); move it to Redis or
 * Postgres if the API is ever scaled horizontally. Blocked attempts are not recorded.
 */
export function createRateLimiter(opts: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const now = opts.now ?? Date.now;
  const hits = new Map<string, number[]>();

  function sweep(t: number) {
    for (const [key, times] of hits) {
      const last = times[times.length - 1];
      if (last === undefined || t - last >= opts.windowMs) hits.delete(key);
    }
  }

  return {
    check(key) {
      const t = now();
      sweep(t);
      const recent = (hits.get(key) ?? []).filter((x) => t - x < opts.windowMs);
      if (recent.length >= opts.limit) {
        hits.set(key, recent);
        const oldest = recent[0]!;
        return { allowed: false, retryAfterSec: Math.ceil((oldest + opts.windowMs - t) / 1000) };
      }
      recent.push(t);
      hits.set(key, recent);
      return { allowed: true };
    },
    size: () => hits.size,
  };
}

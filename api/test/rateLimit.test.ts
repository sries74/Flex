import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../src/rateLimit.js';

describe('createRateLimiter', () => {
  it('allows up to the limit within a window, then blocks with a retry hint', () => {
    let now = 0;
    const rl = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => now });
    expect([1, 2, 3].map(() => rl.check('u').allowed)).toEqual([true, true, true]);
    now = 10_000;
    const blocked = rl.check('u');
    expect(blocked).toEqual({ allowed: false, retryAfterSec: 50 });
  });

  it('frees capacity as old hits leave the window (sliding)', () => {
    let now = 0;
    const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => now });
    rl.check('u');
    now = 600;
    rl.check('u');
    now = 900;
    expect(rl.check('u').allowed).toBe(false);
    now = 1001; // first hit has expired
    expect(rl.check('u').allowed).toBe(true);
  });

  it('keeps users independent', () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    expect(rl.check('a').allowed).toBe(true);
    expect(rl.check('b').allowed).toBe(true);
    expect(rl.check('a').allowed).toBe(false);
  });

  it('does not count blocked attempts against the user', () => {
    let now = 0;
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => now });
    rl.check('u');
    for (let i = 0; i < 50; i++) rl.check('u');
    now = 1001;
    expect(rl.check('u').allowed).toBe(true);
  });

  it('forgets idle users so memory stays bounded', () => {
    let now = 0;
    const rl = createRateLimiter({ limit: 5, windowMs: 1000, now: () => now });
    rl.check('a');
    rl.check('b');
    expect(rl.size()).toBe(2);
    now = 5000;
    rl.check('c');
    expect(rl.size()).toBe(1);
  });
});

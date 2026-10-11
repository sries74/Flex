import { afterEach, describe, expect, it, vi } from 'vitest';
import { OcrProviderError, type OcrService } from '../src/ocr/types.js';
import { createRateLimiter } from '../src/rateLimit.js';
import { auth, setup } from './helpers.js';

let close: (() => Promise<void>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

const body = { image: 'QUJD', mimeType: 'image/jpeg' };
const goodStops = {
  stops: [{ stop_number: 1, address: '12 Example Street', delivery_window_end: '6:30 PM' }],
};

async function ocrApp(ocr?: OcrService, limit = 100) {
  const s = await setup({
    ocr,
    ocrLimiter: createRateLimiter({ limit, windowMs: 60_000 }),
  });
  close = s.close;
  const call = (uid = 'u1', payload: unknown = body) =>
    s.app.inject({
      method: 'POST',
      url: '/v1/ocr',
      headers: { ...auth(uid), 'content-type': 'application/json' },
      payload: JSON.stringify(payload),
    });
  return { ...s, call };
}

describe('POST /v1/ocr', () => {
  it('returns 503 when no OCR provider is configured', async () => {
    const { call } = await ocrApp(undefined);
    const r = await call();
    expect(r.statusCode).toBe(503);
    expect(r.json()).toEqual({ error: 'ocr_unavailable' });
  });

  it('returns the stops from the provider and passes the image through', async () => {
    const extract = vi.fn(async () => goodStops);
    const { call } = await ocrApp({ extract });
    const r = await call();
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual(goodStops);
    expect(extract).toHaveBeenCalledWith({ base64: 'QUJD', mimeType: 'image/jpeg' });
  });

  it.each([
    ['missing image', { mimeType: 'image/jpeg' }],
    ['empty image', { image: '', mimeType: 'image/jpeg' }],
    ['unsupported type', { image: 'QUJD', mimeType: 'image/gif' }],
    ['not an object', 'hello'],
  ])('rejects %s with 400 before calling the provider', async (_n, payload) => {
    const extract = vi.fn(async () => goodStops);
    const { call } = await ocrApp({ extract });
    expect((await call('u1', payload)).statusCode).toBe(400);
    expect(extract).not.toHaveBeenCalled();
  });

  it('answers 502 with a generic body when the provider fails (no leakage)', async () => {
    const { call } = await ocrApp({
      extract: async () => {
        throw new OcrProviderError('upstream said: key=abc123 address=12 Example Street');
      },
    });
    const r = await call();
    expect(r.statusCode).toBe(502);
    expect(r.json()).toEqual({ error: 'ocr_failed' });
    expect(r.body).not.toContain('abc123');
  });

  it('answers 502 when the provider returns an unusable shape', async () => {
    const { call } = await ocrApp({ extract: async () => ({ stops: 'nope' }) });
    expect((await call()).statusCode).toBe(502);
  });

  it('answers 502 for unexpected provider exceptions too', async () => {
    const { call } = await ocrApp({
      extract: async () => {
        throw new Error('boom');
      },
    });
    expect((await call()).statusCode).toBe(502);
  });

  it('rate-limits per user with Retry-After, without calling the provider again', async () => {
    const extract = vi.fn(async () => goodStops);
    const { call } = await ocrApp({ extract }, 2);
    expect((await call('a')).statusCode).toBe(200);
    expect((await call('a')).statusCode).toBe(200);
    const blocked = await call('a');
    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(extract).toHaveBeenCalledTimes(2);
    expect((await call('b')).statusCode).toBe(200); // another user is unaffected
  });
});

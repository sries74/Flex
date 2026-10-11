import { describe, expect, it, vi } from 'vitest';
import { createApiOcrProvider } from './apiProvider';
import { extractWithFallback } from './fallback';
import type { OcrOutcome, OcrProvider } from './types';

const image = { base64: 'AAAA', mimeType: 'image/jpeg' as const };
const okBody = {
  stops: [{ stop_number: 1, address: '12 Example Street', delivery_window_end: '6:30 PM' }],
};

function respond(status: number, body: unknown): typeof fetch {
  return vi.fn(
    async () => new Response(JSON.stringify(body), { status }),
  ) as unknown as typeof fetch;
}

function provider(fetchImpl: typeof fetch, token: string | null = 'tok') {
  return createApiOcrProvider({
    baseUrl: 'https://api.example.test/',
    getToken: async () => token,
    fetchImpl,
  });
}

describe('createApiOcrProvider', () => {
  it('posts the image with the bearer token and returns normalized stops', async () => {
    const fetchImpl = respond(200, okBody);
    const out = await provider(fetchImpl).extract(image);

    expect(out).toMatchObject({ ok: true, stops: [{ stopNumber: 1, windowEndMin: 1110 }] });
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.example.test/v1/ocr');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ image: 'AAAA', mimeType: 'image/jpeg' });
  });

  it('fails with "unauthorized" without calling the network when there is no token', async () => {
    const fetchImpl = respond(200, okBody);
    const out = await provider(fetchImpl, null).extract(image);
    expect(out).toMatchObject({ ok: false, code: 'unauthorized' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'unauthorized'],
    [429, 'rate_limited'],
    [413, 'image_too_large'],
    [500, 'server'],
    [503, 'server'],
  ])('maps HTTP %i to %s', async (status, code) => {
    const out = await provider(respond(status, { error: 'x' })).extract(image);
    expect(out).toMatchObject({ ok: false, code });
  });

  it('reports network failures', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    expect(await provider(fetchImpl).extract(image)).toMatchObject({ ok: false, code: 'network' });
  });

  it('reports a 200 with an unusable body as invalid_response', async () => {
    const out = await provider(respond(200, { nope: true })).extract(image);
    expect(out).toMatchObject({ ok: false, code: 'invalid_response' });
  });

  it('reports a 200 with non-JSON as invalid_response', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('<html>', { status: 200 }),
    ) as unknown as typeof fetch;
    expect(await provider(fetchImpl).extract(image)).toMatchObject({
      ok: false,
      code: 'invalid_response',
    });
  });

  it('never leaks the response body into the user-facing message', async () => {
    const out = await provider(respond(500, { error: 'db password is hunter2' })).extract(image);
    expect(JSON.stringify(out)).not.toContain('hunter2');
  });
});

const good: OcrOutcome = { ok: true, stops: [], issues: [] };
const fail = (code: 'network' | 'server' | 'unauthorized' | 'invalid_response'): OcrOutcome => ({
  ok: false,
  code,
  message: code,
});
const fake = (name: string, outcome: OcrOutcome): OcrProvider & { calls: number } => {
  const p = { name, calls: 0, extract: async () => (p.calls++, outcome) };
  return p;
};

describe('extractWithFallback', () => {
  it('returns the first success and skips the rest', async () => {
    const a = fake('a', good);
    const b = fake('b', good);
    expect(await extractWithFallback([a, b], image)).toEqual({ ...good, provider: 'a' });
    expect(b.calls).toBe(0);
  });

  it.each(['network', 'server', 'invalid_response'] as const)(
    'falls back to the next provider after %s',
    async (code) => {
      const a = fake('a', fail(code));
      const b = fake('b', good);
      expect(await extractWithFallback([a, b], image)).toMatchObject({ ok: true, provider: 'b' });
    },
  );

  it('stops at unauthorized instead of trying other providers', async () => {
    const a = fake('a', fail('unauthorized'));
    const b = fake('b', good);
    expect(await extractWithFallback([a, b], image)).toMatchObject({
      ok: false,
      code: 'unauthorized',
    });
    expect(b.calls).toBe(0);
  });

  it('returns the last failure when every provider fails', async () => {
    const out = await extractWithFallback(
      [fake('a', fail('network')), fake('b', fail('server'))],
      image,
    );
    expect(out).toMatchObject({ ok: false, code: 'server' });
  });

  it('fails clearly with no providers', async () => {
    expect(await extractWithFallback([], image)).toMatchObject({ ok: false });
  });
});

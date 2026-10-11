import { describe, expect, it, vi } from 'vitest';
import { createGeminiOcr } from '../src/ocr/gemini.js';
import { OcrProviderError } from '../src/ocr/types.js';

const image = { base64: 'QUJD', mimeType: 'image/jpeg' as const };
const stopsJson = { stops: [{ stop_number: 1, address: '12 Example Street' }] };

const reply = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

const candidate = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] });

const client = (fetchImpl: typeof fetch) =>
  createGeminiOcr({ apiKey: 'secret-key-123', model: 'test-model', fetchImpl });

describe('createGeminiOcr', () => {
  it('calls generateContent with the key in a header, the image inline, and JSON output pinned', async () => {
    const fetchImpl = reply(candidate(JSON.stringify(stopsJson)));
    const out = await client(fetchImpl).extract(image);
    expect(out).toEqual(stopsJson);

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent',
    );
    expect(String(url)).not.toContain('secret-key-123'); // never in the URL (it would be logged)
    expect(init.headers['x-goog-api-key']).toBe('secret-key-123');

    const body = JSON.parse(init.body);
    const parts = body.contents[0].parts;
    expect(
      parts.some(
        (p: { inline_data?: { mime_type: string; data: string } }) =>
          p.inline_data?.mime_type === 'image/jpeg' && p.inline_data.data === 'QUJD',
      ),
    ).toBe(true);
    expect(body.generationConfig.temperature).toBe(0);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema).toBeDefined();
  });

  it('tells the model to treat text inside the image as data, not instructions', async () => {
    const fetchImpl = reply(candidate(JSON.stringify(stopsJson)));
    await client(fetchImpl).extract(image);
    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1];
    const prompt = JSON.parse(init.body).contents[0].parts.find(
      (p: { text?: string }) => p.text,
    ).text;
    expect(prompt).toMatch(/not instructions|ignore any instructions/i);
  });

  it('joins multi-part text responses', async () => {
    const text = JSON.stringify(stopsJson);
    const body = {
      candidates: [{ content: { parts: [{ text: text.slice(0, 10) }, { text: text.slice(10) }] } }],
    };
    expect(await client(reply(body)).extract(image)).toEqual(stopsJson);
  });

  it.each([
    ['HTTP 500', () => reply({ error: 'boom' }, 500)],
    ['HTTP 429', () => reply({ error: 'quota' }, 429)],
    ['HTTP 400', () => reply({ error: 'bad' }, 400)],
    ['no candidates (blocked)', () => reply({ promptFeedback: { blockReason: 'SAFETY' } })],
    ['empty parts', () => reply({ candidates: [{ content: { parts: [] } }] })],
    ['non-JSON text', () => reply(candidate('Sorry, I cannot help'))],
    [
      'network error',
      () =>
        vi.fn(async () => {
          throw new TypeError('fetch failed');
        }) as unknown as typeof fetch,
    ],
  ])('throws OcrProviderError on %s', async (_n, make) => {
    await expect(client(make()).extract(image)).rejects.toBeInstanceOf(OcrProviderError);
  });

  it('never includes the API key or response body in error messages', async () => {
    const err = await client(reply({ secret: 'leaky-body' }, 500))
      .extract(image)
      .catch((e: Error) => e);
    const text = `${(err as Error).message} ${String((err as Error).cause ?? '')}`;
    expect(text).not.toContain('secret-key-123');
    expect(text).not.toContain('leaky-body');
  });

  it('passes an abort signal so a hung provider cannot hold the request forever', async () => {
    const fetchImpl = reply(candidate(JSON.stringify(stopsJson)));
    await client(fetchImpl).extract(image);
    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

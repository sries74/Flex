import { parseOcrResponse } from '../itinerary/itinerary';
import type { ImageInput, OcrErrorCode, OcrOutcome, OcrProvider } from './types';

// User-facing copy only; never echo server response bodies (they may contain internals).
const MESSAGES: Record<OcrErrorCode, string> = {
  unauthorized: 'Please sign in again.',
  rate_limited: 'Too many scans right now. Wait a moment and try again.',
  image_too_large: 'That image is too large. Try a smaller screenshot.',
  network: 'No connection. Check your network and try again.',
  server: 'The scanning service had a problem. Try again shortly.',
  invalid_response: "We couldn't read the scan result. Try again or enter stops manually.",
};

const fail = (code: OcrErrorCode): OcrOutcome => ({ ok: false, code, message: MESSAGES[code] });

function codeForStatus(status: number): OcrErrorCode {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 429) return 'rate_limited';
  if (status === 413) return 'image_too_large';
  return 'server';
}

export interface ApiOcrOptions {
  /** e.g. https://api.flexcop.ackgent.com */
  baseUrl: string;
  /** Firebase ID token for the Authorization header; null when signed out. */
  getToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

/**
 * Cloud OCR via our API (POST /v1/ocr). The API holds the Gemini key; the app never does (ADR 0004).
 * Contract: request { image: <base64>, mimeType }, response { stops: [...] } in the raw OCR shape.
 */
export function createApiOcrProvider(options: ApiOcrOptions): OcrProvider {
  const doFetch = options.fetchImpl ?? fetch;
  const url = `${options.baseUrl.replace(/\/+$/, '')}/v1/ocr`;

  return {
    name: 'api',
    async extract(image: ImageInput): Promise<OcrOutcome> {
      const token = await options.getToken();
      if (!token) return fail('unauthorized');

      let response: Response;
      try {
        response = await doFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ image: image.base64, mimeType: image.mimeType }),
        });
      } catch {
        return fail('network');
      }

      if (!response.ok) return fail(codeForStatus(response.status));

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return fail('invalid_response');
      }

      const parsed = parseOcrResponse(body);
      return parsed.ok
        ? { ok: true, stops: parsed.stops, issues: parsed.issues }
        : fail('invalid_response');
    },
  };
}

import type { Issue, Stop } from '../itinerary/itinerary';

export interface ImageInput {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
}

export type OcrErrorCode =
  'unauthorized' | 'rate_limited' | 'image_too_large' | 'network' | 'server' | 'invalid_response';

export type OcrOutcome =
  { ok: true; stops: Stop[]; issues: Issue[] } | { ok: false; code: OcrErrorCode; message: string };

/** Anything that can turn an itinerary screenshot into stops: cloud (API → Gemini) or on-device. */
export interface OcrProvider {
  readonly name: string;
  extract(image: ImageInput): Promise<OcrOutcome>;
}

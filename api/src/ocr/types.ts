import { z } from 'zod';

export interface OcrImage {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
}

/** Extracts stops from an itinerary screenshot. Implementations must not retain the image. */
export interface OcrService {
  extract(image: OcrImage): Promise<unknown>;
}

export class OcrProviderError extends Error {
  constructor(message = 'OCR provider failed') {
    super(message);
    this.name = 'OcrProviderError';
  }
}

/** The response contract the mobile app parses (see mobile/lib/itinerary/itinerary.ts). */
export const RawOcrResponse = z.object({
  stops: z
    .array(
      z.object({
        stop_number: z.number().int().positive(),
        address: z.string(),
        delivery_window_start: z.string().nullish(),
        delivery_window_end: z.string().nullish(),
        package_count: z.number().int().nonnegative().nullish(),
        confidence: z.number().min(0).max(1).nullish(),
      }),
    )
    .max(500),
});
export type RawOcrResponseT = z.infer<typeof RawOcrResponse>;

export const OcrRequest = z.object({
  image: z.string().min(1).max(7_000_000),
  mimeType: z.enum(['image/jpeg', 'image/png']),
});

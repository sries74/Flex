import type { ImageInput } from './types';

/** ~7 MB of base64 (~5 MB of image): above this the API would answer 413 anyway. */
export const MAX_BASE64_LENGTH = 7_000_000;

export type ImageResult =
  | { ok: true; image: ImageInput }
  | { ok: false; reason: 'unsupported' | 'unreadable' | 'too_large'; message: string };

/** The bits of an image-picker asset we use (kept structural so this stays testable without native code). */
export interface PickedAsset {
  base64?: string | null;
  mimeType?: string | null;
}

export function toImageInput(asset: PickedAsset): ImageResult {
  if (!asset.base64) {
    return {
      ok: false,
      reason: 'unreadable',
      message: "We couldn't read that image. Try another.",
    };
  }

  const mime = asset.mimeType ?? 'image/jpeg';
  let mimeType: ImageInput['mimeType'];
  if (mime === 'image/png') mimeType = 'image/png';
  else if (mime === 'image/jpeg' || mime === 'image/jpg') mimeType = 'image/jpeg';
  else {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Use a JPEG or PNG screenshot.',
    };
  }

  if (asset.base64.length > MAX_BASE64_LENGTH) {
    return {
      ok: false,
      reason: 'too_large',
      message: 'That image is too large. Try a smaller screenshot.',
    };
  }
  return { ok: true, image: { base64: asset.base64, mimeType } };
}

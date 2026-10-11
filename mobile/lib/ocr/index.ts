import { getAuthService } from '../auth';
import { createApiOcrProvider } from './apiProvider';
import type { OcrProvider } from './types';

export { extractWithFallback } from './fallback';
export { toImageInput } from './toImageInput';
export type { ImageInput, OcrOutcome, OcrProvider } from './types';

/**
 * Providers in the order to try them. Empty when the build has no API URL, so the UI can say
 * scanning isn't set up instead of failing mysteriously. (On-device fallback: T-421.)
 */
export function getOcrProviders(): OcrProvider[] {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) return [];
  return [createApiOcrProvider({ baseUrl, getToken: () => getAuthService().getIdToken() })];
}

import type { ImageInput, OcrOutcome, OcrProvider } from './types';

export type FallbackOutcome = OcrOutcome & { provider?: string };

/**
 * Try providers in order (e.g. cloud first, on-device second).
 * Moves on after transient/format failures; stops at `unauthorized` because another provider
 * won't fix a signed-out user.
 */
export async function extractWithFallback(
  providers: readonly OcrProvider[],
  image: ImageInput,
): Promise<FallbackOutcome> {
  let last: FallbackOutcome = {
    ok: false,
    code: 'server',
    message: 'No scanning method is available.',
  };

  for (const provider of providers) {
    const outcome = await provider.extract(image);
    if (outcome.ok) return { ...outcome, provider: provider.name };
    last = { ...outcome, provider: provider.name };
    if (outcome.code === 'unauthorized') return last;
  }
  return last;
}

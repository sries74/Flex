export type Variant = 'store' | 'sideload';

/** Normalise the build variant (ADR 0002). Anything other than 'sideload' is the store build. */
export function parseVariant(value: unknown): Variant {
  return value === 'sideload' ? 'sideload' : 'store';
}

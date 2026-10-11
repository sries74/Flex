import { describe, expect, it } from 'vitest';
import { parseVariant } from './variant';

describe('parseVariant', () => {
  it('returns sideload only for the exact string', () => {
    expect(parseVariant('sideload')).toBe('sideload');
  });

  it.each([undefined, null, '', 'store', 'SIDELOAD', 42, {}])('defaults to store for %p', (v) => {
    expect(parseVariant(v)).toBe('store');
  });
});

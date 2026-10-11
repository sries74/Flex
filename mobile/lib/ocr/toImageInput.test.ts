import { describe, expect, it } from 'vitest';
import { MAX_BASE64_LENGTH, toImageInput } from './toImageInput';

describe('toImageInput', () => {
  it('accepts a jpeg asset', () => {
    expect(toImageInput({ base64: 'AAAA', mimeType: 'image/jpeg' })).toEqual({
      ok: true,
      image: { base64: 'AAAA', mimeType: 'image/jpeg' },
    });
  });

  it('accepts png', () => {
    expect(toImageInput({ base64: 'AAAA', mimeType: 'image/png' })).toMatchObject({
      ok: true,
      image: { mimeType: 'image/png' },
    });
  });

  it.each([undefined, null, 'image/jpg'])('treats mime type %s as jpeg', (mimeType) => {
    expect(toImageInput({ base64: 'AAAA', mimeType })).toMatchObject({
      ok: true,
      image: { mimeType: 'image/jpeg' },
    });
  });

  it.each(['image/gif', 'image/heic', 'image/webp', 'application/pdf'])(
    'rejects unsupported type %s',
    (mimeType) => {
      expect(toImageInput({ base64: 'AAAA', mimeType })).toMatchObject({
        ok: false,
        reason: 'unsupported',
      });
    },
  );

  it.each([undefined, null, ''])('rejects a missing base64 payload (%j)', (base64) => {
    expect(toImageInput({ base64, mimeType: 'image/jpeg' })).toMatchObject({
      ok: false,
      reason: 'unreadable',
    });
  });

  it('rejects oversized images', () => {
    const big = 'A'.repeat(MAX_BASE64_LENGTH + 1);
    expect(toImageInput({ base64: big, mimeType: 'image/jpeg' })).toMatchObject({
      ok: false,
      reason: 'too_large',
    });
    expect(toImageInput({ base64: 'A'.repeat(MAX_BASE64_LENGTH), mimeType: 'image/jpeg' }).ok).toBe(
      true,
    );
  });

  it('gives a user-facing message for every failure', () => {
    const r = toImageInput({ base64: '', mimeType: 'image/jpeg' });
    expect(r.ok === false && r.message.length > 0).toBe(true);
  });
});

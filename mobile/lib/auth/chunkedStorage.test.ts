import { describe, expect, it } from 'vitest';
import { createChunkedStorage, type KeyValueBackend } from './chunkedStorage';

function memoryBackend(): KeyValueBackend & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
}

describe('createChunkedStorage', () => {
  it('round-trips small values', async () => {
    const s = createChunkedStorage(memoryBackend(), 10);
    await s.setItem('k', 'hello');
    expect(await s.getItem('k')).toBe('hello');
  });

  it('splits and reassembles values larger than the chunk size', async () => {
    const backend = memoryBackend();
    const s = createChunkedStorage(backend, 4);
    const value = 'abcdefghijklmnopqrstuvwxyz';
    await s.setItem('k', value);
    expect(Math.max(...[...backend.data.values()].map((v) => v.length))).toBeLessThanOrEqual(4);
    expect(await s.getItem('k')).toBe(value);
  });

  it('round-trips the empty string', async () => {
    const s = createChunkedStorage(memoryBackend(), 4);
    await s.setItem('k', '');
    expect(await s.getItem('k')).toBe('');
  });

  it('returns null for missing keys', async () => {
    expect(await createChunkedStorage(memoryBackend(), 4).getItem('nope')).toBeNull();
  });

  it('removes every chunk', async () => {
    const backend = memoryBackend();
    const s = createChunkedStorage(backend, 4);
    await s.setItem('k', 'abcdefghij');
    await s.removeItem('k');
    expect(backend.data.size).toBe(0);
    expect(await s.getItem('k')).toBeNull();
  });

  it('overwriting with a shorter value leaves no stale chunks', async () => {
    const backend = memoryBackend();
    const s = createChunkedStorage(backend, 4);
    await s.setItem('k', 'abcdefghijkl');
    await s.setItem('k', 'xy');
    expect(await s.getItem('k')).toBe('xy');
    expect(backend.data.size).toBe(2); // meta + 1 chunk
  });

  it('returns null if a chunk is missing (corrupt store) instead of a partial value', async () => {
    const backend = memoryBackend();
    const s = createChunkedStorage(backend, 4);
    await s.setItem('k', 'abcdefghij');
    backend.data.delete('k.chunk.1');
    expect(await s.getItem('k')).toBeNull();
  });
});

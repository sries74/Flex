/**
 * expo-secure-store caps values at ~2 KB on some platforms; Firebase persists a larger user object.
 * This wraps any async key/value backend and splits values into fixed-size chunks.
 * Layout: `<key>` = chunk count, `<key>.chunk.<i>` = data.
 */
export interface KeyValueBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const DEFAULT_CHUNK_SIZE = 1800;

export function createChunkedStorage(
  backend: KeyValueBackend,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): KeyValueBackend {
  const chunkKey = (key: string, i: number) => `${key}.chunk.${i}`;

  async function readCount(key: string): Promise<number> {
    const raw = await backend.getItem(key);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  async function removeItem(key: string): Promise<void> {
    const count = await readCount(key);
    for (let i = 0; i < count; i++) await backend.removeItem(chunkKey(key, i));
    await backend.removeItem(key);
  }

  return {
    async getItem(key) {
      const count = await readCount(key);
      if (count === 0) return null;
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await backend.getItem(chunkKey(key, i));
        if (part === null) return null; // corrupt: never return a partial value
        parts.push(part);
      }
      return parts.join('');
    },
    async setItem(key, value) {
      await removeItem(key); // drop stale chunks from a previous, longer value
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += chunkSize) chunks.push(value.slice(i, i + chunkSize));
      if (chunks.length === 0) chunks.push('');
      for (let i = 0; i < chunks.length; i++) await backend.setItem(chunkKey(key, i), chunks[i]);
      await backend.setItem(key, String(chunks.length));
    },
    removeItem,
  };
}

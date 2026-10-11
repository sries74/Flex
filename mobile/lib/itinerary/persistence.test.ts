import { describe, expect, it } from 'vitest';
import type { ItineraryState } from './state';
import { createItineraryPersistence, type SimpleKeyValueStore } from './persistence';

function memoryStore(): SimpleKeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
}

const state: ItineraryState = {
  stops: [
    {
      stopNumber: 1,
      address: '12 Example Street',
      windowStartMin: null,
      windowEndMin: 1110,
      packageCount: 2,
      needsReview: true,
    },
  ],
  issues: [{ stopNumber: 1, code: 'low_confidence' }],
  scannedAt: 123,
};

describe('createItineraryPersistence', () => {
  it('round-trips a saved itinerary', async () => {
    const p = createItineraryPersistence(memoryStore());
    await p.save(state);
    expect(await p.load()).toEqual(state);
  });

  it('returns null when nothing is saved', async () => {
    expect(await createItineraryPersistence(memoryStore()).load()).toBeNull();
  });

  it.each(['not json', '{}', '{"version":1}', '{"version":99,"state":{}}', 'null', '[]'])(
    'ignores corrupt or unknown data: %s',
    async (raw) => {
      const store = memoryStore();
      store.data.set('itinerary.v1', raw);
      expect(await createItineraryPersistence(store).load()).toBeNull();
    },
  );

  it('rejects stored stops that fail validation instead of trusting them', async () => {
    const store = memoryStore();
    store.data.set(
      'itinerary.v1',
      JSON.stringify({ version: 1, state: { ...state, stops: [{ stopNumber: 'x' }] } }),
    );
    expect(await createItineraryPersistence(store).load()).toBeNull();
  });

  it('clear removes the saved itinerary', async () => {
    const store = memoryStore();
    const p = createItineraryPersistence(store);
    await p.save(state);
    await p.clear();
    expect(store.data.size).toBe(0);
    expect(await p.load()).toBeNull();
  });

  it('swallows storage failures so the app keeps working', async () => {
    const broken: SimpleKeyValueStore = {
      getItem: async () => {
        throw new Error('disk');
      },
      setItem: async () => {
        throw new Error('disk');
      },
      removeItem: async () => {
        throw new Error('disk');
      },
    };
    const p = createItineraryPersistence(broken);
    expect(await p.load()).toBeNull();
    await expect(p.save(state)).resolves.toBeUndefined();
    await expect(p.clear()).resolves.toBeUndefined();
  });
});

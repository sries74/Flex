import { z } from 'zod';
import type { ItineraryState } from './state';

export interface SimpleKeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const KEY = 'itinerary.v1';
const VERSION = 1;

const StopSchema = z.object({
  stopNumber: z.number().int().positive(),
  address: z.string(),
  windowStartMin: z.number().nullable(),
  windowEndMin: z.number().nullable(),
  packageCount: z.number().nullable(),
  needsReview: z.boolean(),
});

const Saved = z.object({
  version: z.literal(VERSION),
  state: z.object({
    stops: z.array(StopSchema),
    issues: z.array(
      z.object({
        stopNumber: z.number(),
        code: z.enum([
          'duplicate_stop_number',
          'missing_address',
          'unparseable_time',
          'window_inverted',
          'low_confidence',
        ]),
      }),
    ),
    scannedAt: z.number().nullable(),
  }),
});

/**
 * Local persistence for the current itinerary. It holds customer addresses, so it stays on the
 * device, is validated on load (never trusted), is wiped on sign-out, and never throws:
 * a storage failure must not stop the driver from working.
 */
export function createItineraryPersistence(store: SimpleKeyValueStore) {
  return {
    async load(): Promise<ItineraryState | null> {
      try {
        const raw = await store.getItem(KEY);
        if (raw === null) return null;
        const parsed = Saved.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data.state : null;
      } catch {
        return null;
      }
    },
    async save(state: ItineraryState): Promise<void> {
      try {
        await store.setItem(KEY, JSON.stringify({ version: VERSION, state }));
      } catch {
        // best effort
      }
    },
    async clear(): Promise<void> {
      try {
        await store.removeItem(KEY);
      } catch {
        // best effort
      }
    },
  };
}

export type ItineraryPersistence = ReturnType<typeof createItineraryPersistence>;

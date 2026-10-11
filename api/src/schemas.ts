import { z } from 'zod';

export const MAX_STOPS = 500;
export const MAX_ADDRESS = 500;

const minute = z.number().int().min(0).max(1439).nullable();

export const StopInput = z.object({
  stopNumber: z.number().int().min(1).max(100_000),
  address: z
    .string()
    .transform((s) => s.replace(/\s+/g, ' ').trim())
    .pipe(z.string().min(1).max(MAX_ADDRESS)),
  windowStartMin: minute,
  windowEndMin: minute,
  packageCount: z.number().int().min(0).max(10_000).nullable(),
  needsReview: z.boolean().default(false),
});

export const ItineraryInput = z
  .object({
    source: z.enum(['scan', 'manual']),
    scannedAt: z.number().int().nonnegative().nullish(),
    stops: z.array(StopInput).min(1).max(MAX_STOPS),
  })
  .refine((v) => new Set(v.stops.map((s) => s.stopNumber)).size === v.stops.length, {
    path: ['stops'],
    message: 'duplicate stop numbers',
  });

export type StopInputT = z.infer<typeof StopInput>;
export type ItineraryInputT = z.infer<typeof ItineraryInput>;

export const UuidParam = z.string().uuid();

import { z } from 'zod';

/** A delivery stop after validation and normalization. Times are minutes since local midnight. */
export interface Stop {
  stopNumber: number;
  address: string;
  windowStartMin: number | null;
  windowEndMin: number | null;
  packageCount: number | null;
  /** True when anything about this stop is doubtful; the edit/confirm screen highlights it. */
  needsReview: boolean;
}

export type IssueCode =
  | 'duplicate_stop_number'
  | 'missing_address'
  | 'unparseable_time'
  | 'window_inverted'
  | 'low_confidence';

export interface Issue {
  stopNumber: number;
  code: IssueCode;
}

export type ParseResult =
  { ok: true; stops: Stop[]; issues: Issue[] } | { ok: false; error: string };

const MESSAGES: Record<IssueCode, string> = {
  duplicate_stop_number: 'Another stop has the same number, so this one was ignored.',
  missing_address: 'No address was found for this stop.',
  unparseable_time: "A delivery time couldn't be read. Please check it.",
  window_inverted: 'The window ends before it starts. Please check the times.',
  low_confidence: 'This stop was hard to read. Please check it.',
};

export function issueMessage(code: IssueCode): string {
  return MESSAGES[code];
}

/** Below this the OCR provider is telling us it is guessing. */
export const LOW_CONFIDENCE = 0.7;

const TIME_RE = /^\s*(\d{1,2})(?::(\d{2}))?(?:\s*([ap])\.?\s*m\.?)?\s*$/i;

/** "6:30 PM", "6pm", "18:30", "12:00 AM" → minutes since midnight; anything unreadable → null. */
export function parseTimeOfDay(input: unknown): number | null {
  if (typeof input !== 'string') return null;
  const m = TIME_RE.exec(input);
  if (!m) return null;

  let hour = Number.parseInt(m[1], 10);
  const minute = m[2] === undefined ? 0 : Number.parseInt(m[2], 10);
  const meridiem = m[3]?.toLowerCase();
  if (minute > 59) return null;

  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (hour === 12) hour = 0;
    if (meridiem === 'p') hour += 12;
  } else if (hour > 23) {
    return null;
  }
  return hour * 60 + minute;
}

export function normalizeAddress(input: string): string {
  return input
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,(\s*,)+/g, ',')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .replace(/,(?=\S)/g, ', ');
}

const RawStop = z.object({
  stop_number: z.number().int().positive(),
  address: z.string(),
  delivery_window_start: z.string().nullish(),
  delivery_window_end: z.string().nullish(),
  package_count: z.number().int().nonnegative().nullish(),
  confidence: z.number().min(0).max(1).nullish(),
});

const RawResponse = z.object({ stops: z.array(RawStop) });

/**
 * Validate and normalize what an OCR provider returned.
 * Structurally invalid input → { ok: false }. Otherwise every problem with an individual stop is
 * reported as an Issue and the stop is kept (flagged) unless it is unusable (duplicate / no address).
 */
export function parseOcrResponse(raw: unknown): ParseResult {
  const parsed = RawResponse.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'The OCR response did not have the expected shape.' };
  }

  const stops: Stop[] = [];
  const issues: Issue[] = [];
  const seen = new Set<number>();

  for (const s of parsed.data.stops) {
    const n = s.stop_number;
    if (seen.has(n)) {
      issues.push({ stopNumber: n, code: 'duplicate_stop_number' });
      continue;
    }
    seen.add(n);

    const address = normalizeAddress(s.address);
    if (!address) {
      issues.push({ stopNumber: n, code: 'missing_address' });
      continue;
    }

    let needsReview = false;
    const flag = (code: IssueCode) => {
      issues.push({ stopNumber: n, code });
      needsReview = true;
    };

    const readTime = (value: string | null | undefined): number | null => {
      if (value === null || value === undefined || value.trim() === '') return null;
      const minutes = parseTimeOfDay(value);
      if (minutes === null) flag('unparseable_time');
      return minutes;
    };

    const windowStartMin = readTime(s.delivery_window_start);
    const windowEndMin = readTime(s.delivery_window_end);

    if (windowStartMin !== null && windowEndMin !== null && windowEndMin < windowStartMin) {
      flag('window_inverted');
    }
    if (s.confidence !== null && s.confidence !== undefined && s.confidence < LOW_CONFIDENCE) {
      flag('low_confidence');
    }

    stops.push({
      stopNumber: n,
      address,
      windowStartMin,
      windowEndMin,
      packageCount: s.package_count ?? null,
      needsReview,
    });
  }

  stops.sort((a, b) => a.stopNumber - b.stopNumber);
  return { ok: true, stops, issues };
}

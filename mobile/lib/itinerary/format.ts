import { normalizeAddress, parseTimeOfDay, type Stop } from './itinerary';

/** 1110 → "6:30 PM". null → an em dash for display. */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—';
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const meridiem = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${meridiem}`;
}

/** What the edit form holds: everything is a string until it has been validated. */
export interface StopDraft {
  stopNumber: string;
  address: string;
  windowStart: string;
  windowEnd: string;
  packageCount: string;
}

export function draftFromStop(stop: Stop): StopDraft {
  return {
    stopNumber: String(stop.stopNumber),
    address: stop.address,
    windowStart: stop.windowStartMin === null ? '' : formatMinutes(stop.windowStartMin),
    windowEnd: stop.windowEndMin === null ? '' : formatMinutes(stop.windowEndMin),
    packageCount: stop.packageCount === null ? '' : String(stop.packageCount),
  };
}

export type DraftErrors = Partial<Record<keyof StopDraft, string>>;

export type DraftResult = { ok: true; stop: Stop } | { ok: false; errors: DraftErrors };

const TIME_HINT = 'Enter a time like 6:30 PM.';

export function parseStopDraft(
  draft: StopDraft,
  ctx: { existingNumbers: readonly number[]; editingNumber?: number },
): DraftResult {
  const errors: DraftErrors = {};

  const numberText = draft.stopNumber.trim();
  const stopNumber = /^\d+$/.test(numberText) ? Number.parseInt(numberText, 10) : Number.NaN;
  if (!Number.isInteger(stopNumber) || stopNumber < 1) {
    errors.stopNumber = 'Enter a stop number (1 or higher).';
  } else if (stopNumber !== ctx.editingNumber && ctx.existingNumbers.includes(stopNumber)) {
    errors.stopNumber = 'Another stop already uses this number.';
  }

  const address = normalizeAddress(draft.address);
  if (!address) errors.address = 'Enter the delivery address.';

  const readTime = (text: string, field: 'windowStart' | 'windowEnd'): number | null => {
    if (text.trim() === '') return null;
    const minutes = parseTimeOfDay(text);
    if (minutes === null) errors[field] = TIME_HINT;
    return minutes;
  };
  const windowStartMin = readTime(draft.windowStart, 'windowStart');
  const windowEndMin = readTime(draft.windowEnd, 'windowEnd');
  if (
    windowStartMin !== null &&
    windowEndMin !== null &&
    windowEndMin < windowStartMin &&
    !errors.windowEnd
  ) {
    errors.windowEnd = 'The window must end after it starts.';
  }

  let packageCount: number | null = null;
  const countText = draft.packageCount.trim();
  if (countText !== '') {
    if (/^\d+$/.test(countText)) packageCount = Number.parseInt(countText, 10);
    else errors.packageCount = 'Enter a whole number.';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    stop: { stopNumber, address, windowStartMin, windowEndMin, packageCount, needsReview: false },
  };
}

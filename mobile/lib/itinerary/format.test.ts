import { describe, expect, it } from 'vitest';
import type { Stop } from './itinerary';
import { draftFromStop, formatMinutes, parseStopDraft, type StopDraft } from './format';

const stop: Stop = {
  stopNumber: 4,
  address: '9 Sample Road',
  windowStartMin: 900,
  windowEndMin: 1110,
  packageCount: 2,
  needsReview: true,
};

const draft = (patch: Partial<StopDraft> = {}): StopDraft => ({
  stopNumber: '4',
  address: '9 Sample Road',
  windowStart: '',
  windowEnd: '6:30 PM',
  packageCount: '',
  ...patch,
});

describe('formatMinutes', () => {
  it.each([
    [0, '12:00 AM'],
    [30, '12:30 AM'],
    [545, '9:05 AM'],
    [720, '12:00 PM'],
    [750, '12:30 PM'],
    [1110, '6:30 PM'],
    [1439, '11:59 PM'],
    [null, '—'],
  ])('formats %s as %s', (minutes, text) => {
    expect(formatMinutes(minutes)).toBe(text);
  });

  it('round-trips through the parser used for OCR times', async () => {
    const { parseTimeOfDay } = await import('./itinerary');
    for (let m = 0; m < 1440; m += 7) expect(parseTimeOfDay(formatMinutes(m))).toBe(m);
  });
});

describe('draftFromStop', () => {
  it('turns a stop into editable strings', () => {
    expect(draftFromStop(stop)).toEqual({
      stopNumber: '4',
      address: '9 Sample Road',
      windowStart: '3:00 PM',
      windowEnd: '6:30 PM',
      packageCount: '2',
    });
  });

  it('uses empty strings for missing values', () => {
    expect(
      draftFromStop({ ...stop, windowStartMin: null, windowEndMin: null, packageCount: null }),
    ).toMatchObject({ windowStart: '', windowEnd: '', packageCount: '' });
  });
});

describe('parseStopDraft', () => {
  it('accepts a valid draft and marks the stop as reviewed', () => {
    const r = parseStopDraft(draft({ windowStart: '3 PM', packageCount: '3' }), {
      existingNumbers: [1, 2],
    });
    expect(r).toEqual({
      ok: true,
      stop: {
        stopNumber: 4,
        address: '9 Sample Road',
        windowStartMin: 900,
        windowEndMin: 1110,
        packageCount: 3,
        needsReview: false,
      },
    });
  });

  it('normalizes the address', () => {
    const r = parseStopDraft(draft({ address: '  9  Sample  Road ,  Town ' }), {
      existingNumbers: [],
    });
    expect(r.ok && r.stop.address).toBe('9 Sample Road, Town');
  });

  it('allows an empty window and package count', () => {
    const r = parseStopDraft(draft({ windowEnd: '' }), { existingNumbers: [] });
    expect(r).toMatchObject({ ok: true, stop: { windowEndMin: null, packageCount: null } });
  });

  it.each([
    ['empty number', { stopNumber: '' }, 'stopNumber'],
    ['zero', { stopNumber: '0' }, 'stopNumber'],
    ['negative', { stopNumber: '-2' }, 'stopNumber'],
    ['fractional', { stopNumber: '2.5' }, 'stopNumber'],
    ['text', { stopNumber: 'two' }, 'stopNumber'],
    ['blank address', { address: '   ' }, 'address'],
    ['unreadable start', { windowStart: 'soon' }, 'windowStart'],
    ['unreadable end', { windowEnd: '25:00' }, 'windowEnd'],
    ['inverted window', { windowStart: '7 PM', windowEnd: '6 PM' }, 'windowEnd'],
    ['fractional packages', { packageCount: '1.5' }, 'packageCount'],
    ['negative packages', { packageCount: '-1' }, 'packageCount'],
  ])('rejects %s', (_name, patch, field) => {
    const r = parseStopDraft(draft(patch), { existingNumbers: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toContain(field);
  });

  it('rejects a stop number used by another stop but allows keeping its own', () => {
    const clash = parseStopDraft(draft({ stopNumber: '2' }), {
      existingNumbers: [1, 2, 4],
      editingNumber: 4,
    });
    expect(clash).toMatchObject({
      ok: false,
      errors: { stopNumber: 'Another stop already uses this number.' },
    });
    const keep = parseStopDraft(draft({ stopNumber: '4' }), {
      existingNumbers: [1, 2, 4],
      editingNumber: 4,
    });
    expect(keep.ok).toBe(true);
  });

  it('reports every problem at once', () => {
    const r = parseStopDraft(draft({ address: '', stopNumber: '' }), { existingNumbers: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['address', 'stopNumber']);
  });
});

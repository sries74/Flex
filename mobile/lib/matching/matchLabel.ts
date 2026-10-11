import type { Stop } from '../itinerary/itinerary';

export interface MatchCandidate {
  stop: Stop;
  /** 0..1 */
  score: number;
}

export type MatchResult =
  | { kind: 'match'; stop: Stop; score: number }
  | { kind: 'ambiguous'; candidates: MatchCandidate[] }
  | { kind: 'none' };

/** Auto-accept only at or above this score *and* with a clear lead over the runner-up. */
export const MATCH_THRESHOLD = 0.75;
/** Below this a stop is not even offered as a candidate. */
export const POSSIBLE_THRESHOLD = 0.5;
/** Required lead of the best candidate over the second best. */
export const MARGIN = 0.15;

const ABBREVIATIONS: Record<string, string> = {
  st: 'street',
  str: 'street',
  ave: 'avenue',
  av: 'avenue',
  rd: 'road',
  blvd: 'boulevard',
  dr: 'drive',
  ln: 'lane',
  ct: 'court',
  ter: 'terrace',
  terr: 'terrace',
  pl: 'place',
  cir: 'circle',
  pkwy: 'parkway',
  hwy: 'highway',
  n: 'north',
  s: 'south',
  e: 'east',
  w: 'west',
};

const UNIT_WORDS = new Set([
  'apt',
  'apartment',
  'unit',
  'ste',
  'suite',
  'rm',
  'room',
  'fl',
  'floor',
  'bldg',
  'building',
]);

/** Letters OCR commonly confuses with digits, only applied to tokens that already contain a digit. */
const DIGIT_LOOKALIKES: Record<string, string> = { o: '0', l: '1', i: '1' };

function fixDigitLookalikes(token: string): string {
  if (!/\d/.test(token)) return token;
  const fixed = [...token].map((c) => DIGIT_LOOKALIKES[c] ?? c).join('');
  // Only accept the repair when it turns the token into a plain number (e.g. "1o" → "10").
  return /^\d+$/.test(fixed) ? fixed : token;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/#/g, ' unit ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((t) => fixDigitLookalikes(ABBREVIATIONS[t] ?? t));
}

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

function tokenMatches(want: string, have: Set<string>, haveList: string[]): boolean {
  if (have.has(want)) return true;
  if (want.length < 5 || /\d/.test(want)) return false; // short or numeric tokens must match exactly
  return haveList.some(
    (h) => h.length >= 4 && 1 - levenshtein(want, h) / Math.max(want.length, h.length) >= 0.8,
  );
}

interface ParsedAddress {
  house: string | null;
  street: string[];
  city: string[];
  unit: string | null;
}

function parseAddress(address: string): ParsedAddress {
  const [first, ...rest] = address.split(',');
  const tokens = tokenize(first);
  const city = tokenize(rest.join(' '));

  let house: string | null = null;
  let unit: string | null = null;
  const street: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (UNIT_WORDS.has(t)) {
      if (tokens[i + 1] !== undefined && unit === null) unit = tokens[i + 1];
      i++; // skip the unit value too
    } else if (house === null && /^\d+$/.test(t)) {
      house = t;
    } else {
      street.push(t);
    }
  }
  return { house, street, city, unit };
}

const HOUSE_WEIGHT = 2;
const CITY_WEIGHT = 0.25;

interface LabelInfo {
  tokens: string[];
  tokenSet: Set<string>;
  units: string[];
  explicitStop: number | null;
}

function parseLabel(text: string): LabelInfo {
  const explicit = /\bstop\s*#?\s*(\d+)\b/i.exec(text);
  const stripped = explicit ? text.replace(explicit[0], ' ') : text;
  const tokens = tokenize(stripped);
  const units: string[] = [];
  tokens.forEach((t, i) => {
    if (UNIT_WORDS.has(t) && tokens[i + 1] !== undefined) units.push(tokens[i + 1]);
  });
  return {
    tokens,
    tokenSet: new Set(tokens),
    units,
    explicitStop: explicit ? Number.parseInt(explicit[1], 10) : null,
  };
}

function scoreStop(stop: Stop, label: LabelInfo): number {
  const a = parseAddress(stop.address);
  let total = 0;
  let matched = 0;

  if (a.house !== null) {
    total += HOUSE_WEIGHT;
    if (label.tokenSet.has(a.house)) matched += HOUSE_WEIGHT;
  }
  for (const t of a.street) {
    total += 1;
    if (tokenMatches(t, label.tokenSet, label.tokens)) matched += 1;
  }
  for (const t of a.city) {
    total += CITY_WEIGHT;
    if (tokenMatches(t, label.tokenSet, label.tokens)) matched += CITY_WEIGHT;
  }
  if (total === 0) return 0;

  let score = matched / total;
  if (a.unit !== null) {
    if (label.units.length === 0)
      score *= 0.85; // label may simply omit the unit
    else if (label.units.includes(a.unit)) score += 0.15;
    else score *= 0.6;
  }
  if (label.explicitStop !== null && label.explicitStop === stop.stopNumber) score += 0.3;
  return score;
}

/**
 * Match the text read from a package label to one of the itinerary's stops.
 * Only `kind: 'match'` is safe to act on automatically; `ambiguous` should ask the driver.
 */
export function matchLabel(text: string, stops: readonly Stop[]): MatchResult {
  const label = parseLabel(text);
  if (label.tokens.length === 0 || stops.length === 0) return { kind: 'none' };

  const scored = stops
    .map((stop) => ({ stop, raw: scoreStop(stop, label) }))
    .sort((x, y) => y.raw - x.raw);

  const best = scored[0];
  const second = scored[1];

  if (best.raw >= MATCH_THRESHOLD && (!second || best.raw - second.raw >= MARGIN)) {
    return { kind: 'match', stop: best.stop, score: Math.min(1, best.raw) };
  }

  const candidates = scored
    .filter((s) => s.raw >= POSSIBLE_THRESHOLD)
    .slice(0, 3)
    .map((s) => ({ stop: s.stop, score: Math.min(1, s.raw) }));
  return candidates.length > 0 ? { kind: 'ambiguous', candidates } : { kind: 'none' };
}

import type { Db } from './db.js';
import type { ItineraryInputT } from './schemas.js';

export interface UserRow {
  id: string;
  email: string | null;
}

export async function ensureUser(db: Db, uid: string, email: string | null): Promise<UserRow> {
  const r = await db.query<UserRow>(
    `INSERT INTO users (firebase_uid, email) VALUES ($1, $2)
     ON CONFLICT (firebase_uid) DO UPDATE
       SET email = COALESCE(EXCLUDED.email, users.email), last_seen_at = now()
     RETURNING id, email`,
    [uid, email],
  );
  return r.rows[0]!;
}

export async function createItinerary(
  db: Db,
  userId: string,
  input: ItineraryInputT,
): Promise<string> {
  return db.transaction(async (tx) => {
    const it = await tx.query<{ id: string }>(
      `INSERT INTO itineraries (user_id, source, scanned_at)
       VALUES ($1, $2, CASE WHEN $3::bigint IS NULL THEN NULL ELSE to_timestamp($3::bigint / 1000.0) END)
       RETURNING id`,
      [userId, input.source, input.scannedAt ?? null],
    );
    const id = it.rows[0]!.id;

    const params: unknown[] = [id];
    const tuples = input.stops.map((s) => {
      const base = params.length;
      params.push(
        s.stopNumber,
        s.address,
        s.windowStartMin,
        s.windowEndMin,
        s.packageCount,
        s.needsReview,
      );
      return `($1, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    });
    await tx.query(
      `INSERT INTO stops
         (itinerary_id, stop_number, address, window_start_min, window_end_min, package_count, needs_review)
       VALUES ${tuples.join(', ')}`,
      params,
    );
    return id;
  });
}

export interface ItinerarySummary {
  id: string;
  source: string;
  createdAt: string;
  stopCount: number;
}

export async function listItineraries(
  db: Db,
  userId: string,
  limit = 50,
): Promise<ItinerarySummary[]> {
  const r = await db.query<{
    id: string;
    source: string;
    created_at: Date;
    stop_count: string | number;
  }>(
    `SELECT i.id, i.source, i.created_at, count(s.id) AS stop_count
       FROM itineraries i LEFT JOIN stops s ON s.itinerary_id = i.id
      WHERE i.user_id = $1
      GROUP BY i.id
      ORDER BY i.created_at DESC, i.id
      LIMIT $2`,
    [userId, limit],
  );
  return r.rows.map((row) => ({
    id: row.id,
    source: row.source,
    createdAt: new Date(row.created_at).toISOString(),
    stopCount: Number(row.stop_count),
  }));
}

export interface StopOut {
  stopNumber: number;
  address: string;
  windowStartMin: number | null;
  windowEndMin: number | null;
  packageCount: number | null;
  needsReview: boolean;
}

export interface ItineraryOut {
  id: string;
  source: string;
  scannedAt: string | null;
  createdAt: string;
  stops: StopOut[];
}

interface ItineraryRow {
  id: string;
  source: string;
  scanned_at: Date | null;
  created_at: Date;
}
interface StopRow {
  itinerary_id: string;
  stop_number: number;
  address: string;
  window_start_min: number | null;
  window_end_min: number | null;
  package_count: number | null;
  needs_review: boolean;
}

const toStop = (r: StopRow): StopOut => ({
  stopNumber: r.stop_number,
  address: r.address,
  windowStartMin: r.window_start_min,
  windowEndMin: r.window_end_min,
  packageCount: r.package_count,
  needsReview: r.needs_review,
});

function assemble(its: ItineraryRow[], stops: StopRow[]): ItineraryOut[] {
  return its.map((i) => ({
    id: i.id,
    source: i.source,
    scannedAt: i.scanned_at ? new Date(i.scanned_at).toISOString() : null,
    createdAt: new Date(i.created_at).toISOString(),
    stops: stops.filter((s) => s.itinerary_id === i.id).map(toStop),
  }));
}

/** Returns null for "not found" and "not yours" alike, so existence never leaks. */
export async function getItinerary(
  db: Db,
  userId: string,
  id: string,
): Promise<ItineraryOut | null> {
  const its = await db.query<ItineraryRow>(
    'SELECT id, source, scanned_at, created_at FROM itineraries WHERE id = $1 AND user_id = $2',
    [id, userId],
  );
  if (its.rows.length === 0) return null;
  const stops = await db.query<StopRow>(
    'SELECT * FROM stops WHERE itinerary_id = $1 ORDER BY stop_number',
    [id],
  );
  return assemble(its.rows, stops.rows)[0]!;
}

export async function deleteItinerary(db: Db, userId: string, id: string): Promise<boolean> {
  const r = await db.query('DELETE FROM itineraries WHERE id = $1 AND user_id = $2', [id, userId]);
  return r.rowCount > 0;
}

export async function deleteUser(db: Db, userId: string): Promise<void> {
  await db.query('DELETE FROM users WHERE id = $1', [userId]); // cascades to itineraries + stops
}

export async function exportUser(db: Db, userId: string) {
  const user = await db.query<{ email: string | null; created_at: Date }>(
    'SELECT email, created_at FROM users WHERE id = $1',
    [userId],
  );
  const its = await db.query<ItineraryRow>(
    'SELECT id, source, scanned_at, created_at FROM itineraries WHERE user_id = $1 ORDER BY created_at',
    [userId],
  );
  const stops = await db.query<StopRow>(
    `SELECT s.* FROM stops s JOIN itineraries i ON i.id = s.itinerary_id
      WHERE i.user_id = $1 ORDER BY s.stop_number`,
    [userId],
  );
  return {
    user: {
      email: user.rows[0]?.email ?? null,
      createdAt: user.rows[0] ? new Date(user.rows[0].created_at).toISOString() : null,
    },
    itineraries: assemble(its.rows, stops.rows),
  };
}

/** Retention: delete itineraries (and their stops) older than `days`. Returns how many were removed. */
export async function purgeOldItineraries(db: Db, days: number): Promise<number> {
  const r = await db.query(
    `DELETE FROM itineraries WHERE created_at < now() - ($1::int * interval '1 day')`,
    [days],
  );
  return r.rowCount;
}

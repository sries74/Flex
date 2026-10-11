import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db.js';
import { loadMigrations, migrateDown, migrateUp } from '../src/migrate.js';
import { createTestDb } from './pgliteDb.js';

const migrations = loadMigrations(join(import.meta.dirname, '../migrations'));
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
});
afterEach(async () => {
  await db.close();
});

const tables = async () =>
  (
    await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`,
    )
  ).rows.map((r) => r.table_name);

describe('migrations', () => {
  it('has a down file for every up file', () => {
    expect(migrations.length).toBeGreaterThan(0);
    for (const m of migrations) expect(m.down.trim().length).toBeGreaterThan(0);
  });

  it('applies all migrations and records them', async () => {
    const ran = await migrateUp(db, migrations);
    expect(ran).toEqual(migrations.map((m) => m.version));
    expect(await tables()).toEqual(
      expect.arrayContaining(['users', 'itineraries', 'stops', 'schema_migrations']),
    );
  });

  it('is idempotent', async () => {
    await migrateUp(db, migrations);
    expect(await migrateUp(db, migrations)).toEqual([]);
  });

  it('reverts the latest migration cleanly and can re-apply it', async () => {
    await migrateUp(db, migrations);
    const reverted = await migrateDown(db, migrations, migrations.length);
    expect(reverted).toHaveLength(migrations.length);
    expect(await tables()).toEqual(['schema_migrations']);
    expect(await migrateUp(db, migrations)).toHaveLength(migrations.length);
  });

  it('rolls back a failing migration without recording it', async () => {
    const broken = [
      {
        version: '9999_bad',
        up: 'CREATE TABLE ok_table (id int); SELECT nope FROM missing;',
        down: 'SELECT 1',
      },
    ];
    await expect(migrateUp(db, broken)).rejects.toThrow();
    expect(await tables()).not.toContain('ok_table');
    const r = await db.query('SELECT * FROM schema_migrations');
    expect(r.rows).toEqual([]);
  });

  it('refuses to revert a migration whose file is missing', async () => {
    await migrateUp(db, migrations);
    await expect(migrateDown(db, [], 1)).rejects.toThrow(/no file/);
  });
});

describe('schema constraints', () => {
  beforeEach(async () => {
    await migrateUp(db, migrations);
  });

  async function user(uid = 'uid-1') {
    const r = await db.query<{ id: string }>(
      'INSERT INTO users (firebase_uid) VALUES ($1) RETURNING id',
      [uid],
    );
    return r.rows[0]!.id;
  }
  async function itinerary(userId: string) {
    const r = await db.query<{ id: string }>(
      `INSERT INTO itineraries (user_id, source) VALUES ($1, 'manual') RETURNING id`,
      [userId],
    );
    return r.rows[0]!.id;
  }
  const addStop = (itineraryId: string, n: number, extra = '') =>
    db.query(
      `INSERT INTO stops (itinerary_id, stop_number, address ${extra ? ',' + extra.split('=')[0] : ''})
       VALUES ($1, $2, 'addr' ${extra ? ',' + extra.split('=')[1] : ''})`,
      [itineraryId, n],
    );

  it('enforces a unique Firebase uid', async () => {
    await user('dup');
    await expect(user('dup')).rejects.toThrow();
  });

  it('enforces unique stop numbers within an itinerary but not across itineraries', async () => {
    const u = await user();
    const a = await itinerary(u);
    const b = await itinerary(u);
    await addStop(a, 1);
    await expect(addStop(a, 1)).rejects.toThrow();
    await expect(addStop(b, 1)).resolves.toBeDefined();
  });

  it.each([
    ['stop_number', 0],
    ['stop_number', -1],
  ])('rejects %s=%i', async (_c, value) => {
    const a = await itinerary(await user());
    await expect(addStop(a, value)).rejects.toThrow();
  });

  it.each([
    'window_start_min=-1',
    'window_start_min=1440',
    'window_end_min=1440',
    'package_count=-1',
  ])('rejects out-of-range %s', async (extra) => {
    const a = await itinerary(await user());
    await expect(addStop(a, 1, extra)).rejects.toThrow();
  });

  it('accepts the boundary values', async () => {
    const a = await itinerary(await user());
    await expect(addStop(a, 1, 'window_start_min=0')).resolves.toBeDefined();
    await expect(addStop(a, 2, 'window_end_min=1439')).resolves.toBeDefined();
  });

  it('rejects an unknown itinerary source', async () => {
    const u = await user();
    await expect(
      db.query(`INSERT INTO itineraries (user_id, source) VALUES ($1, 'telepathy')`, [u]),
    ).rejects.toThrow();
  });

  it('deleting a user removes their itineraries and stops', async () => {
    const u = await user();
    const a = await itinerary(u);
    await addStop(a, 1);
    await db.query('DELETE FROM users WHERE id = $1', [u]);
    expect((await db.query('SELECT 1 FROM itineraries')).rows).toEqual([]);
    expect((await db.query('SELECT 1 FROM stops')).rows).toEqual([]);
  });
});

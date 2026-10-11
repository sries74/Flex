import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { createPgDb, type Db } from '../src/db.js';
import { createTestDb } from './pgliteDb.js';

/**
 * Tests run on an in-process Postgres (PGlite) by default so they need nothing installed.
 * With TEST_DATABASE_URL set (CI does), every test gets its own throwaway database on that real
 * server instead, so the same suite also exercises the production `pg` adapter.
 */
export const usingRealPostgres = Boolean(process.env.TEST_DATABASE_URL);

export async function createDb(): Promise<{ db: Db; cleanup: () => Promise<void> }> {
  const base = process.env.TEST_DATABASE_URL;
  if (!base) {
    const db = await createTestDb();
    return { db, cleanup: () => db.close() };
  }

  const name = `flex_test_${randomBytes(6).toString('hex')}`;
  const admin = new pg.Client({ connectionString: base });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);

  const url = new URL(base);
  url.pathname = `/${name}`;
  const db = createPgDb(url.toString());

  return {
    db,
    cleanup: async () => {
      await db.close();
      await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await admin.end();
    },
  };
}

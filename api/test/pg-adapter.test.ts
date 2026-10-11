import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../src/db.js';
import { createDb, usingRealPostgres } from './dbFactory.js';

// Only meaningful against a real server: it is the test of src/db.ts's `pg` adapter.
describe.skipIf(!usingRealPostgres)('pg adapter (real Postgres)', () => {
  let db: Db;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    ({ db, cleanup } = await createDb());
    await db.exec('CREATE TABLE t (id int PRIMARY KEY, v text)');
  });
  afterAll(() => cleanup());

  it('runs parameterised queries and reports rowCount', async () => {
    const ins = await db.query('INSERT INTO t VALUES ($1, $2)', [1, 'a']);
    expect(ins.rowCount).toBe(1);
    const sel = await db.query<{ v: string }>('SELECT v FROM t WHERE id = $1', [1]);
    expect(sel.rows).toEqual([{ v: 'a' }]);
  });

  it('exec runs multi-statement scripts', async () => {
    await db.exec(`INSERT INTO t VALUES (10, 'x'); INSERT INTO t VALUES (11, 'y');`);
    const n = await db.query<{ c: string }>('SELECT count(*) AS c FROM t WHERE id >= 10');
    expect(Number(n.rows[0]!.c)).toBe(2);
  });

  it('commits a transaction', async () => {
    await db.transaction(async (tx) => {
      await tx.query('INSERT INTO t VALUES (20, $1)', ['committed']);
    });
    expect((await db.query('SELECT 1 FROM t WHERE id = 20')).rows).toHaveLength(1);
  });

  it('rolls back on error and rethrows', async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.query('INSERT INTO t VALUES (30, $1)', ['gone']);
        throw new Error('abort');
      }),
    ).rejects.toThrow('abort');
    expect((await db.query('SELECT 1 FROM t WHERE id = 30')).rows).toHaveLength(0);
  });

  it('rolls back when a statement fails mid-transaction', async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.query('INSERT INTO t VALUES (40, $1)', ['gone']);
        await tx.query('INSERT INTO t VALUES (1, $1)', ['duplicate key']);
      }),
    ).rejects.toThrow();
    expect((await db.query('SELECT 1 FROM t WHERE id = 40')).rows).toHaveLength(0);
  });

  it('releases connections: many transactions do not exhaust the pool', async () => {
    for (let i = 0; i < 40; i++) {
      await db.transaction(async (tx) => {
        await tx.query('SELECT 1');
      });
    }
    expect((await db.query('SELECT 1')).rows).toHaveLength(1);
  });

  it('rejects nested transactions explicitly', async () => {
    await expect(db.transaction((tx) => tx.transaction(async () => 1))).rejects.toThrow(/Nested/);
  });

  it('survives the server killing idle connections (restart / failover) and keeps working', async () => {
    // Several concurrent queries force the pool to open more than one connection.
    await Promise.all([1, 2, 3].map(() => db.query('SELECT pg_sleep(0.1)')));
    await db.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
        WHERE datname = current_database() AND pid <> pg_backend_pid()`,
    );
    await new Promise((r) => setTimeout(r, 200)); // let the 'error' events fire
    expect((await db.query('SELECT 1 AS ok')).rows).toEqual([{ ok: 1 }]);
  });
});

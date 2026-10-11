import { PGlite } from '@electric-sql/pglite';
import type { Db } from '../src/db.js';

type Queryable = Pick<PGlite, 'query' | 'exec'>;

function wrap(
  pg: Queryable,
  tx: ((fn: (t: never) => Promise<unknown>) => Promise<unknown>) | null,
  close: () => Promise<void>,
): Db {
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      const r = await pg.query<T>(sql, params);
      return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length };
    },
    async exec(sql) {
      await pg.exec(sql);
    },
    async transaction<T>(fn: (t: Db) => Promise<T>): Promise<T> {
      if (!tx) throw new Error('nested transactions are not supported in the test adapter');
      return (await tx(((t: Queryable) => fn(wrap(t, null, async () => {}))) as never)) as T;
    },
    close,
  };
}

/** An in-process Postgres (WASM) so tests run the real SQL without a server. */
export async function createTestDb(): Promise<Db> {
  const pg = await PGlite.create();
  return wrap(
    pg,
    (fn) => pg.transaction(fn as never),
    () => pg.close(),
  );
}

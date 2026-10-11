import pg from 'pg';

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/** The only database surface the app uses, so tests can run the same SQL on an in-process Postgres. */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  /** Run a multi-statement script (migrations). No parameters. */
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

type Queryable = pg.Pool | pg.PoolClient;

function queries(q: Queryable): Pick<Db, 'query' | 'exec'> {
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      const r = await q.query(sql, params);
      return { rows: r.rows as T[], rowCount: r.rowCount ?? 0 };
    },
    async exec(sql) {
      await q.query(sql);
    },
  };
}

export function createPgDb(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });

  return {
    ...queries(pool),
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const tx: Db = {
          ...queries(client),
          transaction: () => Promise.reject(new Error('Nested transactions are not supported')),
          close: async () => {},
        };
        const result = await fn(tx);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

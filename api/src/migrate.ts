import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from './db.js';

export interface Migration {
  version: string;
  up: string;
  down: string;
}

/** Reads `NNNN_name.up.sql` / `NNNN_name.down.sql` pairs from a directory, sorted by version. */
export function loadMigrations(dir: string): Migration[] {
  const files = readdirSync(dir);
  const versions = [
    ...new Set(
      files
        .filter((f) => /\.(up|down)\.sql$/.test(f))
        .map((f) => f.replace(/\.(up|down)\.sql$/, '')),
    ),
  ].sort();

  return versions.map((version) => {
    const up = `${version}.up.sql`;
    const down = `${version}.down.sql`;
    if (!files.includes(up) || !files.includes(down)) {
      throw new Error(`Migration ${version} needs both an .up.sql and a .down.sql file`);
    }
    return {
      version,
      up: readFileSync(join(dir, up), 'utf8'),
      down: readFileSync(join(dir, down), 'utf8'),
    };
  });
}

const ENSURE_TABLE = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

async function applied(db: Db): Promise<string[]> {
  await db.exec(ENSURE_TABLE);
  const r = await db.query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY version',
  );
  return r.rows.map((x) => x.version);
}

/** Apply every pending migration, each in its own transaction. Returns the versions applied. */
export async function migrateUp(db: Db, migrations: Migration[]): Promise<string[]> {
  const done = new Set(await applied(db));
  const ran: string[] = [];
  for (const m of migrations) {
    if (done.has(m.version)) continue;
    await db.transaction(async (tx) => {
      await tx.exec(m.up);
      await tx.query('INSERT INTO schema_migrations (version) VALUES ($1)', [m.version]);
    });
    ran.push(m.version);
  }
  return ran;
}

/** Revert the most recent `steps` migrations (default 1). Returns the versions reverted. */
export async function migrateDown(db: Db, migrations: Migration[], steps = 1): Promise<string[]> {
  const done = await applied(db);
  const byVersion = new Map(migrations.map((m) => [m.version, m]));
  const reverted: string[] = [];
  for (const version of done.slice(-steps).reverse()) {
    const m = byVersion.get(version);
    if (!m) throw new Error(`Applied migration ${version} has no file; refusing to guess`);
    await db.transaction(async (tx) => {
      await tx.exec(m.down);
      await tx.query('DELETE FROM schema_migrations WHERE version = $1', [version]);
    });
    reverted.push(version);
  }
  return reverted;
}

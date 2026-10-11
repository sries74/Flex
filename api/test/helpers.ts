import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { buildApp, type AppDeps } from '../src/app.js';
import type { Db } from '../src/db.js';
import { loadMigrations, migrateUp } from '../src/migrate.js';
import { AuthError, type TokenVerifier } from '../src/auth/verifier.js';
import { createDb } from './dbFactory.js';

/** Accepts tokens of the form `token-<uid>`; everything else is rejected like a bad JWT. */
export const fakeVerifier: TokenVerifier = {
  async verify(token) {
    const m = /^token-(.+)$/.exec(token);
    if (!m) throw new AuthError();
    return { uid: m[1]!, email: `${m[1]}@example.com` };
  },
};

export const auth = (uid: string) => ({ authorization: `Bearer token-${uid}` });

export async function setup(overrides: Partial<AppDeps> = {}): Promise<{
  app: FastifyInstance;
  db: Db;
  close: () => Promise<void>;
}> {
  const { db, cleanup } = await createDb();
  await migrateUp(db, loadMigrations(join(import.meta.dirname, '../migrations')));
  const app = await buildApp({ db, verifier: fakeVerifier, logger: false, ...overrides });
  return {
    app,
    db,
    close: async () => {
      await app.close();
      await cleanup();
    },
  };
}

export const stop = (n: number, extra: Record<string, unknown> = {}) => ({
  stopNumber: n,
  address: `${n} Test Street`,
  windowStartMin: null,
  windowEndMin: 1110,
  packageCount: null,
  needsReview: false,
  ...extra,
});

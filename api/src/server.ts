import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';
import { createFirebaseVerifier } from './auth/verifier.js';
import { loadConfig } from './config.js';
import { createPgDb } from './db.js';
import { loadMigrations, migrateUp } from './migrate.js';
import { createGeminiOcr } from './ocr/gemini.js';
import { createRateLimiter } from './rateLimit.js';

const config = loadConfig();
const db = createPgDb(config.DATABASE_URL);

if (config.RUN_MIGRATIONS) {
  const dir = join(fileURLToPath(new URL('.', import.meta.url)), '../migrations');
  const ran = await migrateUp(db, loadMigrations(dir));
  console.log(`migrations applied: ${ran.length === 0 ? 'none pending' : ran.join(', ')}`);
}

const app = await buildApp({
  db,
  verifier: createFirebaseVerifier({ projectId: config.FIREBASE_PROJECT_ID }),
  ocr:
    config.GEMINI_API_KEY && config.GEMINI_MODEL
      ? createGeminiOcr({ apiKey: config.GEMINI_API_KEY, model: config.GEMINI_MODEL })
      : undefined,
  ocrLimiter: createRateLimiter({ limit: config.OCR_RATE_PER_MIN, windowMs: 60_000 }),
  logger: { level: config.LOG_LEVEL },
});

async function shutdown(signal: string) {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  await db.close();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ port: config.PORT, host: config.HOST });

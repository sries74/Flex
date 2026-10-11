import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createPgDb } from './db.js';
import { loadMigrations, migrateDown, migrateUp } from './migrate.js';

// usage: npm run migrate [up | down [steps]]
const [direction = 'up', stepsArg] = process.argv.slice(2);
const config = loadConfig();
const db = createPgDb(config.DATABASE_URL);
const dir = join(fileURLToPath(new URL('.', import.meta.url)), '../migrations');

try {
  const migrations = loadMigrations(dir);
  if (direction === 'up') {
    console.log('applied:', (await migrateUp(db, migrations)).join(', ') || 'none pending');
  } else if (direction === 'down') {
    const steps = stepsArg ? Number.parseInt(stepsArg, 10) : 1;
    console.log('reverted:', (await migrateDown(db, migrations, steps)).join(', ') || 'none');
  } else {
    throw new Error(`Unknown direction "${direction}" (use up or down)`);
  }
} finally {
  await db.close();
}

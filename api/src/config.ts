import { z } from 'zod';

const Env = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().min(1),
  FIREBASE_PROJECT_ID: z.string().min(1),
  /** OCR is enabled only when both are set. */
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).optional(),
  OCR_RATE_PER_MIN: z.coerce.number().int().min(1).default(10),
  RUN_MIGRATIONS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type Config = z.infer<typeof Env>;

/** Throws a readable error naming the offending variables (never their values). */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((i) => i.path.join('.')))].join(', ');
    throw new Error(`Invalid configuration: ${names}`);
  }
  const c = parsed.data;
  if (Boolean(c.GEMINI_API_KEY) !== Boolean(c.GEMINI_MODEL)) {
    throw new Error('Invalid configuration: set both GEMINI_API_KEY and GEMINI_MODEL, or neither');
  }
  return c;
}

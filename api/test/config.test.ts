import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const base = { DATABASE_URL: 'postgres://u:pw@db/x', FIREBASE_PROJECT_ID: 'proj' };

describe('loadConfig', () => {
  it('applies defaults', () => {
    expect(loadConfig(base)).toMatchObject({
      PORT: 3000,
      LOG_LEVEL: 'info',
      OCR_RATE_PER_MIN: 10,
      RUN_MIGRATIONS: false,
    });
  });

  it.each(['DATABASE_URL', 'FIREBASE_PROJECT_ID'])('requires %s', (key) => {
    expect(() => loadConfig({ ...base, [key]: undefined })).toThrow(key);
  });

  it('names bad variables without printing their values', () => {
    const attempt = () => loadConfig({ ...base, PORT: 'secret-not-a-port' });
    expect(attempt).toThrow('PORT');
    expect(attempt).not.toThrow('secret-not-a-port');
  });

  it('requires the Gemini key and model together', () => {
    expect(() => loadConfig({ ...base, GEMINI_API_KEY: 'k' })).toThrow(/both/);
    expect(() => loadConfig({ ...base, GEMINI_MODEL: 'm' })).toThrow(/both/);
    expect(loadConfig({ ...base, GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm' }).GEMINI_MODEL).toBe('m');
  });

  it('parses RUN_MIGRATIONS', () => {
    expect(loadConfig({ ...base, RUN_MIGRATIONS: 'true' }).RUN_MIGRATIONS).toBe(true);
    expect(() => loadConfig({ ...base, RUN_MIGRATIONS: 'yes' })).toThrow('RUN_MIGRATIONS');
  });
});

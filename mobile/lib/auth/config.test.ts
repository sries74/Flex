import { describe, expect, it } from 'vitest';
import { readFirebaseConfig } from './config';

const full = {
  EXPO_PUBLIC_FIREBASE_API_KEY: 'k',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'd',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'p',
  EXPO_PUBLIC_FIREBASE_APP_ID: 'a',
};

describe('readFirebaseConfig', () => {
  it('returns the config when every value is set', () => {
    expect(readFirebaseConfig(full)).toEqual({
      apiKey: 'k',
      authDomain: 'd',
      projectId: 'p',
      appId: 'a',
    });
  });

  it.each(Object.keys(full))('returns null when %s is missing', (key) => {
    expect(readFirebaseConfig({ ...full, [key]: undefined })).toBeNull();
  });

  it('treats empty strings as missing', () => {
    expect(readFirebaseConfig({ ...full, EXPO_PUBLIC_FIREBASE_API_KEY: '' })).toBeNull();
  });
});

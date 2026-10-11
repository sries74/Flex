import * as SecureStore from 'expo-secure-store';
import type { KeyValueBackend } from './chunkedStorage';

// SecureStore keys may only contain alphanumerics, '.', '-' and '_'. Firebase's keys use ':' — sanitize.
const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

export const secureStoreBackend: KeyValueBackend = {
  getItem: (key) => SecureStore.getItemAsync(safe(key)),
  setItem: (key, value) => SecureStore.setItemAsync(safe(key), value),
  removeItem: (key) => SecureStore.deleteItemAsync(safe(key)),
};

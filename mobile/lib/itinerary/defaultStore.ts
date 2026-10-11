import Storage from 'expo-sqlite/kv-store';
import type { SimpleKeyValueStore } from './persistence';

/** On-device key/value store backed by SQLite (app-private storage). */
export const defaultItineraryStore: SimpleKeyValueStore = {
  getItem: (key) => Storage.getItemAsync(key),
  setItem: (key, value) => Storage.setItemAsync(key, value),
  removeItem: async (key) => {
    await Storage.removeItemAsync(key);
  },
};

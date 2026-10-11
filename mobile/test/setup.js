// expo-sqlite's key/value store needs native code; tests use an in-memory stand-in that is
// emptied before every test so nothing leaks between them.
const mockKv = new Map();

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemAsync: async (key) => (mockKv.has(key) ? mockKv.get(key) : null),
    setItemAsync: async (key, value) => void mockKv.set(key, value),
    removeItemAsync: async (key) => mockKv.delete(key),
  },
}));

beforeEach(() => mockKv.clear());

// A cold Jest cache (every CI run) makes the first router render slow; RNTL's default 1s
// findBy*/waitFor timeout then fails spuriously. Give async queries room.
const { configure } = require('@testing-library/react-native');
configure({ asyncUtilTimeout: 5000 });

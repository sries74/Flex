import { defineConfig } from 'vitest/config';

// Pure TypeScript logic only (lib/**). Anything importing react-native belongs in Jest (jest.config.js).
export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
    coverage: { provider: 'v8', include: ['lib/**/*.ts'], exclude: ['lib/**/*.test.ts'] },
  },
});

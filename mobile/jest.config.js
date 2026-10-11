// React Native / component tests (jest-expo). Pure-TS logic in lib/ uses Vitest — see vitest.config.ts.
module.exports = {
  preset: 'jest-expo',
  // The first test in a file pays for transforming NativeWind/Expo Router on a cold cache.
  testTimeout: 30000,
  testMatch: ['<rootDir>/{app,components}/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  moduleNameMapper: { '\\.css$': '<rootDir>/test/styleMock.js', '^@/(.*)$': '<rootDir>/$1' },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets|standard-navigation)',
  ],
};

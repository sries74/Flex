const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['test/**/*.js'],
    languageOptions: { globals: { jest: 'readonly', beforeEach: 'readonly' } },
  },
  { ignores: ['dist/*', '.expo/*', 'coverage/*'] },
]);

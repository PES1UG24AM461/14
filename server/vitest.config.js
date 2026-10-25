import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // The first run downloads a MongoDB binary for the in-memory test database.
    hookTimeout: 120000,
    testTimeout: 20000,
  },
});

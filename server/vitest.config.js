import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: {
      JWT_SECRET: 'test-only-secret-for-vitest',
    },
    hookTimeout: 120000,
    testTimeout: 20000,
    // OQS-20 / NFR-007: statement coverage of the server code must stay at or above 80%.
    // server.js and config/db.js only start the process and open the real MongoDB connection.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/server.js', 'src/config/db.js'],
      reporter: ['text', 'text-summary', 'html', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      thresholds: { statements: 80 },
    },
  },
});

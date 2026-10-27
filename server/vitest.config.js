
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
  },
});

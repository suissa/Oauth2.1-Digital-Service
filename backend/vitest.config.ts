import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 60000,
    include: ['**/tests/**/*.test.ts'],
    threads: false,
    setupFiles: ['./tests/setup.ts'],
  },
});
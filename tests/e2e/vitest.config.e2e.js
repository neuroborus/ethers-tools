import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'e2e',
    include: ['tests/e2e/**/*.e2e-test.js'],
    environment: 'node',
    maxConcurrency: 1,
    fileParallelism: false,
    sequence: {
      concurrent: false,
      shuffle: false,
    },
    threads: {
      singleThread: true,
    },
    forks: {
      singleFork: true,
    },
  },
});

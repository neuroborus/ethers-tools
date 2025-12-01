import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'anvil',
    include: ['tests/anvil/**/*.anvil-test.js'],
    environment: 'node',
    testTimeout: 100000,
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

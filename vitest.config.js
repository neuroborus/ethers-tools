export default {
  test: {
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
};

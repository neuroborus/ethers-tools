import { createSignalsPromise } from './index.js';

/**
 * @template T
 * @param {() => Promise<T>} racer
 * @param {AbortSignal[]} [signals=[]]
 * @returns {Promise<T>}
 */
export const raceWithSignals = async (racer, signals = []) => {
  for (const signal of signals) {
    signal.throwIfAborted();
  }

  const signalsPromise = createSignalsPromise(signals);
  const cleanup = signalsPromise.cleanup ?? (() => {});

  try {
    return await Promise.race([racer(), signalsPromise]);
  } finally {
    cleanup();
  }
};

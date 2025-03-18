import { createSignalsPromise } from './index.js';

/**
 * @template T
 * @param {() => Promise<T>} racer
 * @param {AbortSignal[]} [signals=[]]
 * @returns {Promise<T>}
 */
export async function raceWithSignals(racer, signals = []) {
  for (const signal of signals) {
    signal.throwIfAborted();
  }

  return Promise.race([racer(), createSignalsPromise(signals)]);
}

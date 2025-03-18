/**
 * @param {AbortSignal[]} [signals]
 * @returns {Promise<never>}
 */
export function createSignalsPromise(signals) {
  return new Promise((_, reject) => {
    const onAbort = (signal) =>
      reject(signal.reason || new Error('Operation aborted'));

    for (const signal of signals) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

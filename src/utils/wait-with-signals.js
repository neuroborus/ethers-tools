/**
 * @param {number} ms
 * @param {AbortSignal[]} [signals=[]]
 * @returns {Promise<void>}
 */
export function waitWithSignals(ms, signals = []) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);

    if (signals) {
      function onAbort(signal) {
        clearTimeout(timeout);
        reject(signal.reason || new Error('Operation aborted'));
      }

      for (const signal of signals) {
        signal.addEventListener('abort', () => onAbort(signal), { once: true });
        if (signal.aborted) {
          onAbort(signal);
          return;
        }
      }
    }
  });
}

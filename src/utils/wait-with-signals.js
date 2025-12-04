import { abortError } from './abort-error.js';

/**
 * @param {number} ms
 * @param {AbortSignal[]} [signals=[]]
 * @returns {Promise<void>}
 */
export const waitWithSignals = (ms, signals = []) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    /** @type {{ signal: AbortSignal; handler: () => void }[]} */
    const listeners = [];

    const cleanup = () => {
      clearTimeout(timeout);
      for (const { signal, handler } of listeners) {
        signal.removeEventListener('abort', handler);
      }
      listeners.length = 0;
    };

    const onAbort = (signal) => {
      cleanup();
      reject(abortError(signal.reason));
    };

    for (const signal of signals) {
      const handler = () => onAbort(signal);
      listeners.push({ signal, handler });
      signal.addEventListener('abort', handler, { once: true });

      if (signal.aborted) {
        // If already aborted, handle immediately and cleanup listeners
        onAbort(signal);
        return;
      }
    }
  });
};

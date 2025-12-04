import { abortError } from './abort-error.js';

/**
 * @param {AbortSignal[]} [signals=[]]
 * @returns {Promise<never> & { cleanup: () => {} }}
 */
export const createSignalsPromise = (signals = []) => {
  /** @type {{ signal: AbortSignal; handler: () => {} }[]} */
  const listeners = [];

  const cleanup = () => {
    for (const { signal, handler } of listeners) {
      signal.removeEventListener('abort', handler);
    }
    listeners.length = 0;
  };

  /** @type {Promise<never> & { cleanup?: () => {} }} */
  const promise = new Promise((_, reject) => {
    const finalize = (signal) => {
      cleanup();
      reject(abortError(signal?.reason));
    };

    if (!signals.length) {
      return;
    }

    for (const signal of signals) {
      if (signal.aborted) {
        finalize(signal);
        return;
      }

      const handler = () => finalize(signal);
      listeners.push({ signal, handler });
      signal.addEventListener('abort', handler, { once: true });
    }
  });

  promise.cleanup = cleanup;

  return promise;
};

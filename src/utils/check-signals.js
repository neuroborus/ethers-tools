/**
 * @param {AbortSignal[]} [signals]
 * @returns {void}
 */
export const checkSignals = (signals) => {
  if (signals) signals.forEach((signal) => signal.throwIfAborted());
};

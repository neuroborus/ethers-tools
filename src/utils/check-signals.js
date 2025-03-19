/**
 * @param {AbortSignal[]} [signals]
 * @returns {void}
 */
export function checkSignals(signals) {
  if (signals) signals.forEach((signal) => signal.throwIfAborted());
}

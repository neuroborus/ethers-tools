/**
 * @param {number} ms
 * @returns {AbortSignal}
 */
export const createTimeoutSignal = (ms) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort('Timeout exceeded'), ms);
  return controller.signal;
};

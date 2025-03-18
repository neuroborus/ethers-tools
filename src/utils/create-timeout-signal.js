/**
 * @param {number} ms
 * @returns {AbortSignal}
 */
export function createTimeoutSignal(ms) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

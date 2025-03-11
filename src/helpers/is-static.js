import { StateMutability } from '../entities/index.js';

/**
 * @param {StateMutability | string} state
 * @returns {boolean}
 */
export const isStaticMethod = (state) => {
  return state === StateMutability.View || state === StateMutability.Pure;
};

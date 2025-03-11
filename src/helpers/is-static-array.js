import { isStaticMethod } from './is-static.js';

/**
 * @param {import('../../types/entities').ContractCall[]} calls
 * @returns {boolean}
 */
export const isStaticArray = (calls) =>
  !calls.some((call) => !isStaticMethod(call.stateMutability));

import { isStaticMethod } from './is-static.js';

/**
 * @public
 * @param {import('../../types/entities').ContractCall[]} calls
 * @returns {import('../../types/entities').SplitCalls}
 */
export const splitCalls = (calls) =>
  calls.reduce(
    (acc, call, index) => {
      if (isStaticMethod(call.stateMutability)) {
        acc.staticCalls.push(call);
        acc.staticIndexes.push(index);
      } else {
        acc.mutableCalls.push(call);
        acc.mutableIndexes.push(index);
      }
      return acc;
    },
    {
      staticCalls: [],
      staticIndexes: [],
      mutableCalls: [],
      mutableIndexes: [],
    }
  );

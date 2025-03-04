import { isStaticMethod } from '../helpers/index.js';

/**
 * @public
 * @param {import('../../types/entities/index.js').ContractCall[]} calls
 * @returns {import('../../types/entities/index.js').SplitCalls}
 */
export const multicallSplitCalls = (calls) =>
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

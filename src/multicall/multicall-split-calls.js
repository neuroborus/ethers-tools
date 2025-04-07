import { isStaticMethod } from '../helpers/index.js';

/**
 * @public
 * @param {import('../../types/entities/index.js').ContractCall[]} calls
 * @param {import('../../types/entities/index.js').Tagable[]} tags
 * @returns {import('../../types/entities/index.js').SplitCalls}
 */
export const multicallSplitCalls = (calls, tags) =>
  calls.reduce(
    (acc, call, index) => {
      if (isStaticMethod(call.stateMutability)) {
        acc.staticCalls.push(call);
        acc.staticIndexes.push(index);
      } else {
        acc.mutableCalls.push(call);
        acc.mutableTags.push(tags[index]);
        acc.mutableIndexes.push(index);
      }
      return acc;
    },
    {
      staticCalls: [],
      staticIndexes: [],
      mutableCalls: [],
      mutableTags: [],
      mutableIndexes: [],
    }
  );

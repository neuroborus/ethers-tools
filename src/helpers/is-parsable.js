/**
 * @param {import('types/entities').ContractCall} call
 * @returns {boolean}
 */
export const isParsable = (call) =>
  call.method !== undefined && call.contractInterface !== undefined;

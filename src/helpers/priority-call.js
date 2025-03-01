import { PRIORITY_CALL_MULTIPLIER } from '../constants.js';

/**
 * @param {import('ethers').Provider} provider
 * @param {import('ethers').Signer} signer
 * @param {import('ethers').Contract} contract
 * @param {string} method
 * @param {any[]} [args]
 * @param {import('../../types/entities').PriorityCallOptions} options
 */
export async function priorityCall(
  provider,
  signer,
  contract,
  method,
  args = [],
  options = {
    multiplier: PRIORITY_CALL_MULTIPLIER,
  }
) {
  const [originalFeeData, originalGasLimit] = await gatherOriginalData(
    provider,
    contract,
    method,
    args,
    options.asynchronous
  );

  const gasPrice = Math.ceil(
    options.multiplier * Number(originalFeeData.gasPrice)
  );
  const gasLimit = Math.ceil(options.multiplier * Number(originalGasLimit));
  const txn = await contract.getFunction(method).populateTransaction(args, {
    gasLimit,
    gasPrice,
  });
  // Prevents conflicts when using signer.sendTransaction(txn), as the signer should determine the from address.
  // Avoids potential issues if from is incorrectly set or differs from the signer's address.
  delete txn.from;

  if (options.provideChainId) {
    const network = await provider.getNetwork();
    txn.chainId = network.chainId;
  } else {
    if (options.chainId) txn.chainId = options.chainId;
  }

  return signer.sendTransaction(txn);
}

/**
 * @param {import('ethers').Provider} provider
 * @param {import('ethers').Contract} contract
 * @param {string} method
 * @param {any[]} [args]
 * @param {boolean} asynchronous
 */
async function gatherOriginalData(
  provider,
  contract,
  method,
  args,
  asynchronous
) {
  let originalFeeData, originalGasLimit;
  if (asynchronous) {
    [originalFeeData, originalGasLimit] = await Promise.all([
      provider.getFeeData(),
      contract.getFunction(method).estimateGas(args),
    ]);
    return [originalFeeData, originalGasLimit];
  }
  originalFeeData = await provider.getFeeData();
  originalGasLimit = await contract.getFunction(method).estimateGas(args);

  return [originalFeeData, originalGasLimit];
}

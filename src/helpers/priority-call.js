import { DEFAULT_PRIORITY_CALL_MULTIPLIER } from '../constants.js';
import { checkSignals, createTimeoutSignal } from '../utils/index.js';

/**
 * @param {import('ethers').Provider} provider
 * @param {import('ethers').Signer} signer
 * @param {import('ethers').Contract} contract
 * @param {string} method
 * @param {any[]} [args=[]]
 * @param {import('../../types/entities').PriorityCallOptions} [options={}]
 * @returns {Promise<import('ethers').TransactionResponse>}
 */
export async function priorityCall(
  provider,
  signer,
  contract,
  method,
  args = [],
  options = {}
) {
  const localOptions = {
    multiplier: DEFAULT_PRIORITY_CALL_MULTIPLIER,
    ...options,
  };

  const localSignals = [];
  if (localOptions.signals) localSignals.push(...localOptions.signals);
  if (localOptions.timeoutMs)
    localSignals.push(createTimeoutSignal(localOptions.timeoutMs));

  checkSignals(localSignals);
  const [originalFeeData, originalGasLimit] = await gatherOriginalData(
    provider,
    contract,
    method,
    args,
    localOptions.asynchronous,
    localSignals
  );

  const maxFeePerGas = Math.ceil(
    localOptions.multiplier * Number(originalFeeData.maxFeePerGas)
  );
  const maxPriorityFeePerGas = Math.ceil(
    localOptions.multiplier * Number(originalFeeData.maxPriorityFeePerGas)
  );

  const gasLimit = Math.ceil(
    localOptions.multiplier * Number(originalGasLimit)
  );
  checkSignals(localSignals);
  const txn = await contract.getFunction(method).populateTransaction(...args, {
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
  // Prevents conflicts when using signer.sendTransaction(txn), as the signer should determine the from address.
  // Avoids potential issues if from is incorrectly set or differs from the signer's address.
  delete txn.from;

  if (localOptions.provideChainId) {
    checkSignals(localSignals);
    const network = await provider.getNetwork();
    txn.chainId = network.chainId;
  } else {
    if (localOptions.chainId) txn.chainId = localOptions.chainId;
  }

  checkSignals(localSignals);
  return signer.sendTransaction(txn);
}

/**
 * @param {import('ethers').Provider} provider
 * @param {import('ethers').Contract} contract
 * @param {string} method
 * @param {any[]} [args]
 * @param {boolean} asynchronous
 * @param {AbortSignal[]} signals
 * @returns {Promise<[import('ethers').FeeData, bigint]>}
 */
async function gatherOriginalData(
  provider,
  contract,
  method,
  args,
  asynchronous,
  signals
) {
  let originalFeeData, originalGasLimit;
  checkSignals(signals);
  if (asynchronous) {
    [originalFeeData, originalGasLimit] = await Promise.all([
      provider.getFeeData(),
      contract.getFunction(method).estimateGas(...args),
    ]);
    return [originalFeeData, originalGasLimit];
  }
  originalFeeData = await provider.getFeeData();
  checkSignals(signals);
  originalGasLimit = await contract.getFunction(method).estimateGas(...args);

  return [originalFeeData, originalGasLimit];
}

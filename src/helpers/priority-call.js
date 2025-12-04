import { config } from '../config.js';
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
export const priorityCall = async (
  provider,
  signer,
  contract,
  method,
  args = [],
  options = {}
) => {
  const txn = await formTx(provider, signer, contract, method, args, options);

  return signer.sendTransaction(txn);
};

/**
 * @param {import('ethers').Provider} provider
 * @param {import('ethers').Signer} signer
 * @param {import('ethers').Contract} contract
 * @param {string} method
 * @param {any[]} [args=[]]
 * @param {import('../../types/entities').PriorityCallOptions} [options={}]
 * @returns {Promise<bigint>}
 */
export const priorityCallEstimate = async (
  provider,
  signer,
  contract,
  method,
  args = [],
  options = {}
) => {
  const txn = await formTx(provider, signer, contract, method, args, options);

  return signer.estimateGas(txn);
};

/**
 * @param {import('ethers').Provider} provider
 * @param {import('ethers').Signer} signer
 * @param {import('ethers').Contract} contract
 * @param {string} method
 * @param {any[]} [args=[]]
 * @param {import('../../types/entities').PriorityCallOptions} [options={}]
 * @returns {Promise<import('ethers').TransactionLike<string>>}
 */
const formTx = async (
  provider,
  signer,
  contract,
  method,
  args = [],
  options = {}
) => {
  const localOptions = {
    multiplier: config.priorityCalls.multiplier,
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
    localOptions.parallelFeeRequests,
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

  if (localOptions.autoDetectChainId) {
    checkSignals(localSignals);
    const network = await provider.getNetwork();
    txn.chainId = network.chainId;
  } else {
    if (localOptions.chainId) txn.chainId = localOptions.chainId;
  }

  return txn;
};

/**
 * @param {import('ethers').Provider} provider
 * @param {import('ethers').Contract} contract
 * @param {string} method
 * @param {any[]} [args]
 * @param {boolean} parallelFeeRequests
 * @param {AbortSignal[]} signals
 * @returns {Promise<[import('ethers').FeeData, bigint]>}
 */
const gatherOriginalData = async (
  provider,
  contract,
  method,
  args,
  parallelFeeRequests,
  signals
) => {
  let originalFeeData, originalGasLimit;
  checkSignals(signals);
  if (parallelFeeRequests) {
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
};

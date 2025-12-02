import { checkSignals } from '../utils/index.js';

/**
 * @param {string} address
 * @param {import('ethers').Provider} provider
 * @param {number} [delayMs=1000]
 * @param {AbortSignal[]} [signals=[]]
 * @returns {Promise<void>}
 */
export const waitForAddressPendingTxs = async (
  address,
  provider,
  delayMs = 1000,
  signals = []
) => {
  let flag = true;
  while (flag) {
    const pendingNonce = await provider.getTransactionCount(address, 'pending');
    const latestNonce = await provider.getTransactionCount(address, 'latest');
    flag = pendingNonce > latestNonce;

    if (flag) await new Promise((resolve) => setTimeout(resolve, delayMs));
    checkSignals(signals);
  }
};

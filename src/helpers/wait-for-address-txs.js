/**
 * @param {string} address
 * @param {import('ethers').Provider} provider
 * @param {number} [delayMs=1000]
 * @returns {Promise<void>}
 */
export const waitForAddressTxs = async (address, provider, delayMs = 1000) => {
  let flag = true;
  while (flag) {
    const pendingNonce = await provider.getTransactionCount(address, 'pending');
    const latestNonce = await provider.getTransactionCount(address, 'latest');
    flag = pendingNonce > latestNonce;

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
};

/**
 * @param {import('ethers').Provider | import('ethers').Signer} driver
 * @returns {boolean}
 */
export const isSigner = (driver) => {
  return typeof driver?.getAddress === 'function';
};

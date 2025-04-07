/**
 * @param {import('ethers').Provider | import('ethers').Signer} driver
 * @returns {boolean}
 */
export const isSigner = (driver) => typeof driver?.getAddress === 'function';

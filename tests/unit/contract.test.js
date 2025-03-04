import { describe, expect, test } from 'vitest';
import { JsonRpcProvider, Wallet } from 'ethers';
import { CONTRACTS_ERRORS } from '../../src/errors';
import { PROVIDER, RegistryContract, WALLET } from '../stub.js';

const registryProvider = new RegistryContract(PROVIDER);
const registryWallet = new RegistryContract(WALLET);

describe('Test Contract', () => {
  test('Provider should be readonly & callable', () => {
    expect(registryProvider.readonly).to.be.true;
    expect(registryProvider.callable).to.be.true;
  });

  test('Wallet should be non-readonly & callable', () => {
    expect(registryWallet.readonly).to.be.false;
    expect(registryWallet.callable).to.be.true;
  });

  test('Provider should throw error if write', () => {
    registryProvider
      .renounceOwnership()
      .catch((err) =>
        expect(err).toEqual(CONTRACTS_ERRORS.READ_ONLY_CONTRACT_MUTATION)
      );
  });

  test('Should provide provider', () => {
    const pp = registryProvider.provider;
    const pw = registryWallet.provider;
    expect(pp).toBeInstanceOf(JsonRpcProvider);
    expect(pw).toBeInstanceOf(JsonRpcProvider);
  });

  test('Should provide signer', () => {
    const pp = registryProvider.signer;
    const pw = registryWallet.signer;
    expect(pp).to.be.undefined;
    expect(pw).toBeInstanceOf(Wallet);
  });
});

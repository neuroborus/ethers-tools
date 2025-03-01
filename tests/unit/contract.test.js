import { describe, expect, test } from 'vitest';
import { CONTRACTS_ERRORS } from '../../src/errors/contracts.js';
import { PROVIDER, RegistryContract, WALLET } from '../stub.js';

const registryProvider = new RegistryContract(PROVIDER);
const registryWallet = new RegistryContract(WALLET);

describe('Test Contract', () => {
  test('Provider should be readonly & callable', () => {
    expect(registryProvider.isReadonly).to.be.true;
    expect(registryProvider.isCallable).to.be.true;
  });

  test('Wallet should be non-readonly & callable', () => {
    expect(registryWallet.isReadonly).to.be.false;
    expect(registryWallet.isCallable).to.be.true;
  });

  test('Provider should throw error if write', () => {
    registryProvider
      .renounceOwnership()
      .catch((err) =>
        expect(err).toEqual(CONTRACTS_ERRORS.READ_ONLY_CONTRACT_MUTATION)
      );
  });
});

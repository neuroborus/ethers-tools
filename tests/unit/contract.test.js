import { describe, test, expect } from 'vitest';
import { RegistryContract, PROVIDER, WALLET } from '../stub.js';
import { CONTRACTS_ERRORS } from '../../src/errors/contracts.js';

const registryProvider = new RegistryContract(PROVIDER);
const registryWallet = new RegistryContract(WALLET);

describe('Test Contract', () => {
  test('Provider should be readonly & callable', async () => {
    expect(registryProvider.isReadonly).to.be.true;
    expect(registryProvider.isCallable).to.be.true;
  });

  test('Wallet should be non-readonly & callable', async () => {
    expect(registryWallet.isReadonly).to.be.false;
    expect(registryWallet.isCallable).to.be.true;
  });

  test('Provider should throw error if write', async () => {
    registryProvider
      .renounceOwnership()
      .catch((err) =>
        expect(err).toEqual(CONTRACTS_ERRORS.TRY_TO_CALL_NON_CALLABLE)
      );
  });
});

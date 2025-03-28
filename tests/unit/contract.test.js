import { JsonRpcProvider, Wallet } from 'ethers';
import { describe, expect, test } from 'vitest';
import { CONTRACTS_ERRORS } from '../../src/errors';
import { JSON_PROVIDER, JSON_WALLET, RegistryContract } from '../stub.js';

const registryProvider = new RegistryContract(JSON_PROVIDER); // read-only instance
const registryWallet = new RegistryContract(JSON_WALLET); // write-enabled instance

describe('RegistryContract Metadata & Behavior', () => {
  test('read-only contract (provider) should be callable', () => {
    expect(registryProvider.readonly).to.be.true;
    expect(registryProvider.callable).to.be.true;
  });

  test('write-enabled contract (wallet) should be callable and not read-only', () => {
    expect(registryWallet.readonly).to.be.false;
    expect(registryWallet.callable).to.be.true;
  });

  test('attempting to mutate state using provider-only instance should throw', async () => {
    let error;
    try {
      await registryProvider.renounceOwnership();
    } catch (err) {
      error = err;
    }

    expect(error).toEqual(CONTRACTS_ERRORS.READ_ONLY_CONTRACT_MUTATION);
  });

  test('provider field should always be a JsonRpcProvider', () => {
    const fromProvider = registryProvider.provider;
    const fromWallet = registryWallet.provider;

    expect(fromProvider).toBeInstanceOf(JsonRpcProvider);
    expect(fromWallet).toBeInstanceOf(JsonRpcProvider);
  });

  test('signer field should be undefined for provider-only, and Wallet for write-enabled', () => {
    const fromProvider = registryProvider.signer;
    const fromWallet = registryWallet.signer;

    expect(fromProvider).to.be.undefined;
    expect(fromWallet).toBeInstanceOf(Wallet);
  });

  test('listening to logs should throw if no WebSocket provider is used', async () => {
    let error;
    try {
      await registryProvider.listenEvent('', () => {});
    } catch (err) {
      error = err;
    }

    expect(error).toEqual(CONTRACTS_ERRORS.MISSING_WEBSOCKET_PROVIDER);
  });
});

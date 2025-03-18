import { JsonRpcProvider, Wallet } from 'ethers';
import { describe, expect, test } from 'vitest';
import { CONTRACTS_ERRORS } from '../../src/errors';
import { JSON_PROVIDER, JSON_WALLET, RegistryContract } from '../stub.js';

const registryProvider = new RegistryContract(JSON_PROVIDER);
const registryWallet = new RegistryContract(JSON_WALLET);

describe('Test Contract', () => {
  test('Provider should be readonly & callable', () => {
    expect(registryProvider.readonly).to.be.true;
    expect(registryProvider.callable).to.be.true;
  });

  test('Wallet should be non-readonly & callable', () => {
    expect(registryWallet.readonly).to.be.false;
    expect(registryWallet.callable).to.be.true;
  });

  test('Provider should throw error if write', async () => {
    let error;
    try {
      await registryProvider.renounceOwnership();
    } catch (err) {
      error = err;
    }
    expect(error).toEqual(CONTRACTS_ERRORS.READ_ONLY_CONTRACT_MUTATION);
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

  test('Should throw if listen logs without WebsocketProvider', async () => {
    let error;
    try {
      await registryProvider.listenEvent('', () => {});
    } catch (err) {
      error = err;
    }
    expect(error).toEqual(CONTRACTS_ERRORS.MISSING_WEBSOCKET_PROVIDER);
  });
});

import { describe, expect, test } from 'vitest';
import {
  RegistryAutoClass,
  RegistryAutoInstance,
  RegistryContract,
  WSS_PROVIDER,
} from '../mock.js';

// Instantiate the registry contract with the WebSocket provider
export const registry = new RegistryContract(WSS_PROVIDER);

describe('RegistryContract E2E Tests', () => {
  test('fetches logs for OwnershipTransferred events between two blocks', async () => {
    const fromBlock = 16291006;
    const toBlock = 16291281;
    const eventNames = ['OwnershipTransferred'];

    const logs = await registry.getLogs(fromBlock, eventNames, toBlock);

    expect(logs.length).toEqual(4);
  });

  test('streams logs for AddressesProviderRegistered event until a specific block', async () => {
    const fromBlock = -1; // 1 block diapason
    const toBlock = 20713917;
    const eventNames = ['AddressesProviderRegistered'];

    const collectedLogs = new Set();

    for await (const log of registry.getLogsStream(
      fromBlock,
      eventNames,
      toBlock
    )) {
      collectedLogs.add(log);
    }

    expect(collectedLogs.size).toEqual(1);
  });

  test('auto instance should contains generated methods', async () => {
    const owner = await RegistryAutoInstance.owner();
    expect(owner).to.be.length(42);
  });

  test('auto class should contains generated methods', async () => {
    const instance = new RegistryAutoClass();
    const owner = await instance.owner();
    expect(owner).to.be.length(42);
  });
});

import { describe, expect, test } from 'vitest';
import { RegistryContract, WSS_PROVIDER } from '../stub.js';

export const registry = new RegistryContract(WSS_PROVIDER);

describe('E2E Test Contract', () => {
  test('Test of Logs', async () => {
    const logs = await registry.getLogs(
      16291006,
      ['OwnershipTransferred'],
      16291281
    );
    expect(logs.length).toEqual(4);
  });
  test('Test of Logs stream', async () => {
    const data = new Set();
    for await (const log of registry.getLogsStream(
      -1,
      ['AddressesProviderRegistered'],
      20713917
    )) {
      if (!log) continue;

      const parsedLog = registry.contract.interface.parseLog(log);
      if (parsedLog) {
        data.add(parsedLog.args);
      }
    }
    expect(data.size).toEqual(1);
  });
});

import { describe, expect, test } from 'vitest';
import { CONTRACTS_ERRORS, MULTICALL_ERRORS } from '../../src/errors/index.js';
import { MulticallUnit } from '../../src/index.js';
import { JSON_PROVIDER, RegistryContract } from '../stub.js';

const registryProvider = new RegistryContract(JSON_PROVIDER);
const multicallProvider = new MulticallUnit(JSON_PROVIDER);

describe('Test Multicall Unit', () => {
  test('Multicall should recognize static properly', () => {
    expect(multicallProvider.static).to.be.true;
    multicallProvider.add(0, registryProvider.getOwnerCall());
    expect(multicallProvider.static).to.be.true;
    multicallProvider.add(1, registryProvider.getRenounceOwnershipCall());
    expect(multicallProvider.static).to.be.false;
  });

  test('Provider should not process write call', async () => {
    let error;
    try {
      multicallProvider.add(1, registryProvider.getRenounceOwnershipCall());
      await multicallProvider.run().catch((err) => (error = err));
    } catch (err) {
      error = err;
    }
    expect(error).toEqual(CONTRACTS_ERRORS.READ_ONLY_CONTRACT_MUTATION);
    expect(multicallProvider.static).to.be.false;
  });

  test('Should be cleared completely', () => {
    multicallProvider.clear();
    expect(multicallProvider.calls.length).to.be.equal(0);
    expect(multicallProvider.tags.length).to.be.equal(0);
    expect(multicallProvider.success).to.be.undefined;
  });

  test('Should not allow simultaneous run', async () => {
    let error;
    try {
      multicallProvider.add(1, registryProvider.getOwnerCall());
      await Promise.all([multicallProvider.run(), multicallProvider.run()]);
    } catch (err) {
      error = err;
    }
    expect(error).toEqual(MULTICALL_ERRORS.SIMULTANEOUS_INVOCATIONS);
  });
});

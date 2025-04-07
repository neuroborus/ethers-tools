import { describe, expect, test } from 'vitest';
import { CONTRACTS_ERRORS, MULTICALL_ERRORS } from '../../src/errors/index.js';
import { MulticallUnit } from '../../src/index.js';
import { JSON_PROVIDER, RegistryContract } from '../mock.js';

const registryProvider = new RegistryContract(JSON_PROVIDER);
const multicallProvider = new MulticallUnit(JSON_PROVIDER);

describe('MulticallUnit Behavior and Edge Cases', () => {
  test('detects whether all calls are static (readonly)', () => {
    expect(multicallProvider.static).to.be.true;

    multicallProvider.add(registryProvider.getOwnerCall(), 0); // static call
    expect(multicallProvider.static).to.be.true;

    multicallProvider.add(registryProvider.getRenounceOwnershipCall(), 1); // write call
    expect(multicallProvider.static).to.be.false;
  });

  test('throws on write call using readonly contract', async () => {
    let error;

    try {
      multicallProvider.add(registryProvider.getRenounceOwnershipCall(), 1);
      await multicallProvider.run().catch((err) => (error = err));
    } catch (err) {
      error = err;
    }

    expect(error).toEqual(CONTRACTS_ERRORS.READ_ONLY_CONTRACT_MUTATION);
    expect(multicallProvider.static).to.be.false;
  });

  test('clears internal call and tag state correctly', () => {
    multicallProvider.clear();

    expect(multicallProvider.calls.length).to.equal(0);
    expect(multicallProvider.tags.length).to.equal(0);
    expect(multicallProvider.success).to.be.undefined;
  });

  test('prevents simultaneous execution of .run()', async () => {
    multicallProvider.clear();
    multicallProvider.add(registryProvider.getOwnerCall());

    let error;

    try {
      await Promise.all([multicallProvider.run(), multicallProvider.run()]);
    } catch (err) {
      error = err;
    }

    expect(error).toEqual(MULTICALL_ERRORS.SIMULTANEOUS_INVOCATIONS);
  });
});

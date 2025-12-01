import { describe, expect, test } from 'vitest';
import { CONTRACTS_ERRORS, MULTICALL_ERRORS } from '../../src/errors/index.js';
import { MulticallUnit, waitWithSignals } from '../../src/index.js';
import { CometContract, JSON_PROVIDER, RegistryContract } from '../e2e/mock.js';

const registryProvider = new RegistryContract(JSON_PROVIDER);
const multicallUnit = new MulticallUnit(JSON_PROVIDER);
const cometContract = new CometContract(JSON_PROVIDER);

describe('MulticallUnit Behavior and Edge Cases', () => {
  test('detects whether all calls are static (readonly)', () => {
    expect(multicallUnit.static).to.be.true;

    multicallUnit.add(registryProvider.getOwnerCall(), 0); // static call
    expect(multicallUnit.static).to.be.true;

    multicallUnit.add(registryProvider.getRenounceOwnershipCall(), 1); // write call
    expect(multicallUnit.static).to.be.false;
  });

  test('throws on write call using readonly contract', async () => {
    let error;

    try {
      multicallUnit.add(registryProvider.getRenounceOwnershipCall(), 1);
      await multicallUnit.run().catch((err) => (error = err));
    } catch (err) {
      error = err;
    }

    expect(error).toEqual(CONTRACTS_ERRORS.READ_ONLY_CONTRACT_MUTATION);
    expect(multicallUnit.static).to.be.false;
  });

  test('clears internal call and tag state correctly', () => {
    multicallUnit.clear();

    expect(multicallUnit.calls.length).to.equal(0);
    expect(multicallUnit.tags.length).to.equal(0);
    expect(multicallUnit.success).to.be.undefined;
  });

  test('prevents simultaneous execution of .run()', async () => {
    multicallUnit.clear();
    multicallUnit.add(registryProvider.getOwnerCall());

    let error;

    try {
      await Promise.all([multicallUnit.run(), multicallUnit.run()]);
    } catch (err) {
      error = err;
    }

    expect(error).toEqual(MULTICALL_ERRORS.SIMULTANEOUS_INVOCATIONS);
  });

  test('respects maxAsyncReadBatches for static calls', async () => {
    const isolatedUnit = new MulticallUnit(JSON_PROVIDER);

    const views = 5;
    for (let i = 0; i < views; ++i) {
      isolatedUnit.add(cometContract.getUserBasicCall());
    }

    let inFlight = 0;
    let maxInFlight = 0;
    let wasInFlight = 0;

    const originalProcessStaticCalls =
      isolatedUnit._processStaticCalls.bind(isolatedUnit);

    isolatedUnit._processStaticCalls = async (calls, runOptions) => {
      ++inFlight;
      maxInFlight = Math.max(maxInFlight, inFlight);

      // Simulate slow RPC
      await waitWithSignals(50);

      --inFlight;
      ++wasInFlight;

      // Return a fake successful response for each call
      return calls.map(() => [42n, null]);
    };

    await isolatedUnit.run({
      maxStaticCallsStack: 1,
      maxAsyncReadBatches: 3,
    });

    isolatedUnit._processStaticCalls = originalProcessStaticCalls;

    expect(maxInFlight).to.be.equal(3);
    expect(wasInFlight).to.be.equal(views);
  });
});

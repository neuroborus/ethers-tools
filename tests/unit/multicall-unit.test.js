import { describe, test, expect } from 'vitest';
import { RegistryContract, PROVIDER } from '../stub.js';
import { MulticallUnit } from '../../src/index.js';
import { CONTRACTS_ERRORS } from '../../src/errors/contracts.js';

const registryProvider = new RegistryContract(PROVIDER);
const multicallProvider = new MulticallUnit(PROVIDER);

describe('Test Multicall Unit', () => {
  test('Multicall should recognize static properly', () => {
    expect(multicallProvider.static).to.be.true;
    multicallProvider.add(0, registryProvider.getOwnerCall());
    expect(multicallProvider.static).to.be.true;
    multicallProvider.add(1, registryProvider.getRenounceOwnershipCall());
    expect(multicallProvider.static).to.be.false;
  });

  test('Provider should not process write call', async () => {
    multicallProvider
      .run()
      .catch((err) =>
        expect(err).toEqual(CONTRACTS_ERRORS.TRY_TO_CALL_READ_ONLY)
      );
  });

  test('Should be cleared completely', async () => {
    multicallProvider.clear();
    expect(multicallProvider.calls.length).to.be.equal(0);
    expect(multicallProvider.tags.length).to.be.equal(0);
    expect(multicallProvider.success).to.be.undefined;
  });
});

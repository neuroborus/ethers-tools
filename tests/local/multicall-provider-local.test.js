import { TransactionResponse } from 'ethers';
import { describe, expect, test } from 'vitest';
import { waitForAddressTxs } from '../../src/index.js';
import { MULTICALL_PROVIDER_CONTRACT, WALLET } from './local.mock.js';

describe('MulticallProvider - Local Test', () => {
  test('checking out for async calls', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);

    const [first, second, both, writeCount, setFirstTx] =
      await Promise.all([
        MULTICALL_PROVIDER_CONTRACT['getFirst'](),
        MULTICALL_PROVIDER_CONTRACT['getSecond'](),
        MULTICALL_PROVIDER_CONTRACT['getBoth'](),
        MULTICALL_PROVIDER_CONTRACT['getWriteCount'](),
        MULTICALL_PROVIDER_CONTRACT['setFirst'](222),
      ]);

    expect(typeof both[0]).to.be.eq('bigint');
    expect(typeof first).to.be.eq('bigint');
    expect(typeof second).to.be.eq('bigint');
    expect(typeof writeCount).to.be.eq('bigint');
    expect(setFirstTx).to.be.instanceOf(TransactionResponse);
  });
});

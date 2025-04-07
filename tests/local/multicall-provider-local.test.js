import { TransactionResponse } from 'ethers';
import { describe, expect, test } from 'vitest';
import { waitForAddressTxs } from '../../src/index.js';
import { ETHERS_MULTICALL_CONTRACT, WALLET } from './local.mock.js';

describe('MulticallProvider - Local Test', () => {
  test('checking out for async calls', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);

    const [first, second, both, writeCount, setFirstTx, setSecondTx] =
      await Promise.all([
        ETHERS_MULTICALL_CONTRACT['getFirst'](),
        ETHERS_MULTICALL_CONTRACT['getSecond'](),
        ETHERS_MULTICALL_CONTRACT['getBoth'](),
        ETHERS_MULTICALL_CONTRACT['getWriteCount'](),
        ETHERS_MULTICALL_CONTRACT['setFirst'](222),
      ]);

    expect(typeof both[0]).to.be.eq('bigint');
    expect(typeof first).to.be.eq('bigint');
    expect(typeof second).to.be.eq('bigint');
    expect(typeof writeCount).to.be.eq('bigint');
    expect(setFirstTx).to.be.instanceOf(TransactionResponse);
  });
});

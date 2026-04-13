import { TransactionResponse } from 'ethers';
import { describe, expect, test } from 'vitest';
import { waitForAddressPendingTxs } from '../../src/index.js';
import { MULTICALL_PROVIDER_CONTRACT, WALLET } from './anvil.mock.js';

describe('MulticallProvider - Local Test', () => {
  test('batches concurrent read-only calls in one tick', async () => {
    const [first, second, both, writeCount] = await Promise.all([
      MULTICALL_PROVIDER_CONTRACT['getFirst'](),
      MULTICALL_PROVIDER_CONTRACT['getSecond'](),
      MULTICALL_PROVIDER_CONTRACT['getBoth'](),
      MULTICALL_PROVIDER_CONTRACT['getWriteCount'](),
    ]);

    expect(typeof first).to.equal('bigint');
    expect(typeof second).to.equal('bigint');
    expect(typeof both[0]).to.equal('bigint');
    expect(typeof both[1]).to.equal('bigint');
    expect(typeof writeCount).to.equal('bigint');
  });

  test('write call returns TransactionResponse', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const tx = await MULTICALL_PROVIDER_CONTRACT['setFirst'](555);
    expect(tx).toBeInstanceOf(TransactionResponse);

    await tx.wait();
  });

  test('concurrent reads + write are batched and resolve correctly', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const [first, second, both, writeCount, setFirstTx] = await Promise.all([
      MULTICALL_PROVIDER_CONTRACT['getFirst'](),
      MULTICALL_PROVIDER_CONTRACT['getSecond'](),
      MULTICALL_PROVIDER_CONTRACT['getBoth'](),
      MULTICALL_PROVIDER_CONTRACT['getWriteCount'](),
      MULTICALL_PROVIDER_CONTRACT['setFirst'](222),
    ]);

    expect(typeof both[0]).to.equal('bigint');
    expect(typeof first).to.equal('bigint');
    expect(typeof second).to.equal('bigint');
    expect(typeof writeCount).to.equal('bigint');
    expect(setFirstTx).toBeInstanceOf(TransactionResponse);
  });

  test('state changes are visible after write completes', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const marker = 777n;
    const tx = await MULTICALL_PROVIDER_CONTRACT['setFirst'](marker);
    await tx.wait();

    const value = await MULTICALL_PROVIDER_CONTRACT['getFirst']();
    expect(value).to.equal(marker);
  });

  test('sequential writes preserve ordering', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const tx1 = await MULTICALL_PROVIDER_CONTRACT['setFirst'](100);
    await tx1.wait();

    const tx2 = await MULTICALL_PROVIDER_CONTRACT['setSecond'](200);
    await tx2.wait();

    const [first, second] = await Promise.all([
      MULTICALL_PROVIDER_CONTRACT['getFirst'](),
      MULTICALL_PROVIDER_CONTRACT['getSecond'](),
    ]);

    expect(first).to.equal(100n);
    expect(second).to.equal(200n);
  });
});

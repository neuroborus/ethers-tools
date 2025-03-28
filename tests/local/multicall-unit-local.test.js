import { TransactionReceipt, TransactionResponse } from 'ethers';
import { describe, expect, test } from 'vitest';
import { waitForAddressTxs, MulticallUnit } from '../../src/index.js';
import {
  AsyncAbortController,
  MULTICALL_ADDRESS,
  SimpleStorage,
  WALLET,
} from './local.stub.js';

const storage = new SimpleStorage(WALLET);

// noinspection t
describe('MulticallUnit - Testnet E2E', () => {
  test('does not wait for tx receipts (write calls with raw responses)', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);

    const unit = new MulticallUnit(
      WALLET,
      {
        maxMutableCallsStack: 2,
        waitForTxs: false,
      },
      MULTICALL_ADDRESS
    );

    for (let i = 0; i < 1; i++) {
      unit.add(storage.setFirstCall(i), [i]);
      unit.add(storage.setSecondCall(i), [i, i]);
    }

    const result = await unit.run();
    expect(result).to.be.true;

    for (let i = 0; i < 1; i++) {
      expect(unit.isSuccess([i])).to.be.true;
      expect(unit.isSuccess([i, i])).to.be.true;
      expect(unit.getRaw([i])).toBeInstanceOf(TransactionResponse);
      expect(unit.getRaw([i, i])).toBeInstanceOf(TransactionResponse);
    }

    // Wait manually after `waitForTxs: false`
    const tx = unit.getRaw([0]);
    await tx.wait();
  });

  test('waits for tx receipts automatically (write calls)', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);

    const unit = new MulticallUnit(
      WALLET,
      { maxMutableCallsStack: 2 },
      MULTICALL_ADDRESS
    );

    for (let i = 0; i < 3; i++) {
      unit.add(storage.setFirstCall(i), [i]);
      unit.add(storage.setSecondCall(i), [i, i]);
    }

    const result = await unit.run();
    expect(result).to.be.true;

    for (let i = 0; i < 3; i++) {
      expect(unit.isSuccess([i])).to.be.true;
      expect(unit.isSuccess([i, i])).to.be.true;
      expect(unit.getRaw([i])).toBeInstanceOf(TransactionReceipt);
      expect(unit.getRaw([i, i])).toBeInstanceOf(TransactionReceipt);
    }
  });

  test('executes write calls with highPriorityTxs', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);

    const unit = new MulticallUnit(
      WALLET,
      {
        maxMutableCallsStack: 2,
        highPriorityTxs: true,
      },
      MULTICALL_ADDRESS
    );

    for (let i = 0; i < 3; i++) {
      unit.add(storage.setFirstCall(i), [i]);
      unit.add(storage.setSecondCall(i), [i, i]);
    }

    const result = await unit.run();
    expect(result).to.be.true;

    for (let i = 0; i < 3; i++) {
      expect(unit.isSuccess([i])).to.be.true;
      expect(unit.isSuccess([i, i])).to.be.true;
      expect(unit.getRaw([i])).toBeInstanceOf(TransactionReceipt);
      expect(unit.getRaw([i, i])).toBeInstanceOf(TransactionReceipt);
    }

    const uniqueTxs = new Set(unit.response);
    expect(uniqueTxs.size).to.be.eq(3);
  });

  test('handles mixed static and mutable calls', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);

    const unit = new MulticallUnit(
      WALLET,
      {
        maxStaticCallsStack: 5,
        maxMutableCallsStack: 2,
        highPriorityTxs: true,
      },
      MULTICALL_ADDRESS
    );

    for (let i = 0; i < 3; i++) {
      unit.add(storage.getFirstCall(), [i]);
      unit.add(storage.getSecondCall(), [i, i]);
    }

    unit.add(storage.setFirstCall(9), 1);
    unit.add(storage.setSecondCall(9), 2);

    const result = await unit.run();
    expect(result).to.be.true;

    for (let i = 0; i < 3; i++) {
      expect(unit.getSingle([i])).to.be.eq(9n);
      expect(unit.getSingle([i, i])).to.be.eq(9n);
    }

    expect(unit.getSingle(1)).to.be.null;
    expect(unit.getSingle(2)).to.be.null;
    expect(unit.getRaw(1)).to.be.instanceOf(TransactionReceipt);
    expect(unit.getRaw(2)).to.be.instanceOf(TransactionReceipt);
  });

  test('reads static data successfully', async () => {
    const unit = new MulticallUnit(
      WALLET,
      { maxStaticCallsStack: 2 },
      MULTICALL_ADDRESS
    );

    unit.add(storage.getFirstCall(), [0]);
    unit.add(storage.getSecondCall(), [0, 0]);

    const result = await unit.run();
    expect(result).to.be.true;

    expect(unit.isSuccess([0])).to.be.true;
    expect(unit.isSuccess([0, 0])).to.be.true;
    expect(unit.getSingle([0])).to.be.eq(9n);
    expect(unit.getSingle([0, 0])).to.be.eq(9n);
  });

  test('fails static call due to timeout', async () => {
    const unit = new MulticallUnit(
      WALLET,
      {
        staticCallsTimeoutMs: 1,
        maxStaticCallsStack: 1,
      },
      MULTICALL_ADDRESS
    );

    unit.add(storage.getFirstCall(), [0]);
    unit.add(storage.getSecondCall(), [0, 0]);

    let error;
    try {
      await unit.run();
    } catch (err) {
      error = err;
    }

    expect(error).to.be.match(/aborted/);
    expect(unit.success).to.be.false;
  });

  test('aborts static call with signal', async () => {
    const controller = new AsyncAbortController();

    const unit = new MulticallUnit(
      WALLET,
      {
        highPriorityTxs: true,
        signals: [controller.signal],
        maxStaticCallsStack: 2,
      },
      MULTICALL_ADDRESS
    );

    unit.add(storage.getFirstCall(), [0]);
    unit.add(storage.getSecondCall(), [0, 0]);

    controller.abort();

    let error;
    try {
      await unit.run();
    } catch (err) {
      error = err;
    }

    expect(error).to.be.match(/aborted/);
    expect(unit.success).to.be.false;
  });

  test('gets decoded object (named)', async () => {
    const unit = new MulticallUnit(
      WALLET,
      {
        highPriorityTxs: true,
        maxStaticCallsStack: 2,
      },
      MULTICALL_ADDRESS
    );

    unit.add(storage.setFirstCall(0), 0);
    unit.add(storage.setSecondCall(1), 1);
    unit.add(storage.getBothCall(), 2);

    const result = await unit.run();
    const both = unit.getObjectOrThrow(2);

    expect(both['first']).to.be.eq(0n);
    expect(both['second']).to.be.eq(1n);
    expect(result).to.be.true;
  });

  test('gets both object and single values', async () => {
    const unit = new MulticallUnit(
      WALLET,
      {
        highPriorityTxs: true,
        maxStaticCallsStack: 2,
      },
      MULTICALL_ADDRESS
    );

    unit.add(storage.setFirstCall(0), 0);
    unit.add(storage.setSecondCall(1), 1);
    unit.add(storage.getBothCall(), 2);
    unit.add(storage.getFirstCall(), 3);

    const result = await unit.run();

    const both = unit.get(2);
    const first = unit.get(3);

    expect(both['first']).to.be.eq(0n);
    expect(both['second']).to.be.eq(1n);
    expect(first).to.be.eq(0n);
    expect(result).to.be.true;
  });
});

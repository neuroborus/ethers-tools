import { describe, expect, test } from 'vitest';
import { MulticallUnit, waitForAddressTxs } from '../../src/index.js';
import {
  AsyncAbortController,
  MULTICALL_ADDRESS,
  SimpleStorage,
  WALLET,
} from './local.mock.js';

const storage = new SimpleStorage(WALLET);

describe('Local BaseContract Tests', () => {
  test('listens to FirstChanged events emitted during multiple txs', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);

    let eventCount = 0;
    storage
      .listenEvent('FirstChanged', () => {
        eventCount++;
      })
      .catch(console.error);

    const unit = new MulticallUnit(
      WALLET,
      {
        maxMutableCallsStack: 2,
        highPriorityTxs: true,
      },
      MULTICALL_ADDRESS
    );

    for (let i = 0; i < 10; i++) {
      unit.add(storage.setFirstCall(i), [i]);
      unit.add(storage.setSecondCall(i), [i, i]);
    }

    const result = await unit.run();
    expect(result).to.be.true;
    expect(eventCount).to.be.gte(10);
  });

  test('writes a value and reads logs from the past 10 blocks', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);

    const tx = await storage.setFirst(90);
    await tx.wait();

    const logs = await storage.getLogs(-10);
    expect(logs.length).to.be.gt(0);
  });

  test('aborts transaction due to timeout', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);

    let error;
    try {
      await storage.setFirst(90, {
        timeoutMs: 1,
        highPriorityTx: true,
      });
    } catch (err) {
      error = err;
    }

    expect(error.message).to.match(/aborted/);
  });

  test('aborts transaction using an aborted signal', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);

    const controller = new AsyncAbortController();
    controller.abort();

    let error;
    try {
      await storage.setFirst(90, {
        signals: [controller.signal],
      });
    } catch (err) {
      error = err;
    }

    expect(error.message).to.match(/aborted/);
  });

  test('aborts log fetching using signal during async race', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);

    const controller = new AsyncAbortController();
    let error;

    try {
      await Promise.all([
        storage.getLogs(-10, [], 0, {
          signals: [controller.signal],
        }),
        controller.abortAsync(10),
      ]);
    } catch (err) {
      error = err;
    }

    expect(error.message).to.match(/aborted/);
  });
});

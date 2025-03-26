import { describe, expect, test } from 'vitest';
import { waitForAddressTxs } from '../../src/helpers/index.js';
import { MulticallUnit } from '../../src/index.js';
import {
  AsyncAbortController,
  MULTICALL_ADDRESS,
  SimpleStorage,
  WALLET,
} from './local.stub.js';

const storage = new SimpleStorage(WALLET);

// noinspection t
describe('Local Test of Contract', () => {
  test('Test of listenEvent', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);
    let counter = 0;
    storage
      .listenEvent('FirstChanged', () => {
        counter++;
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
      unit.add([i], storage.setFirstCall(i));
      unit.add([i, i], storage.setSecondCall(i));
    }
    const result = await unit.run();
    expect(result).to.be.true;

    expect(counter).to.be.gte(10);
  });

  test('Test of logs', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);
    const tx = await storage.setFirst(90);
    await tx.wait();
    const logs = await storage.getLogs(-10);

    expect(logs.length).to.be.gt(0);
  });

  test('Test of calls abort - timeout', async () => {
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
    expect(error.message).to.be.match(new RegExp(/aborted/));
  });
  test('Test of calls abort - signals', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);
    const controller = new AsyncAbortController();
    let error;
    try {
      controller.abort();
      await storage.setFirst(90, {
        signals: [controller.signal],
      });
    } catch (err) {
      error = err;
    }
    expect(error.message).to.be.match(new RegExp(/aborted/));
  });
  test('Test of logs abort - signals', async () => {
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
    expect(error.message).to.be.match(new RegExp(/aborted/));
  });
});

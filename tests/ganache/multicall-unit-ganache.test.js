import { describe, expect, test } from 'vitest';
import { TransactionReceipt, TransactionResponse } from 'ethers';
import { MulticallUnit } from '../../src/index.js';
import { waitForAddressTxs } from '../../src/helpers/index.js';
import { WALLET, SimpleStorage } from './ganache.stub.js';

const storage = new SimpleStorage(WALLET);

// noinspection t
describe('E2E Test of MulticallUnit - Testnet', () => {
  test('Test of write calls - do not wait', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);
    const unit = new MulticallUnit(WALLET, {
      maxCallsStack: 20,
      waitForTxs: false,
    });

    for (let i = 0; i < 10; i++) {
      unit.add(i, storage.setCall(i));
    }
    const result = await unit.run();
    expect(result).to.be.true;

    for (let i = 0; i < 10; i++) {
      expect(unit.isSuccess(i)).to.be.true;
      const tx = unit.getRaw(i);
      expect(tx).toBeInstanceOf(TransactionResponse);
    }
    for (let i = 0; i < 10; i++) {
      const tx = unit.getRaw(i); // Same for whole stack
      await tx.wait(); // wait for healthy ending before next steps
    }
  });

  test('Test of write calls - wait', async () => {
    const unit = new MulticallUnit(WALLET, {
      maxCallsStack: 20,
    });

    for (let i = 0; i < 10; i++) {
      unit.add(i, storage.setCall(i));
    }
    const result = await unit.run();
    expect(result).to.be.true;

    for (let i = 0; i < 10; i++) {
      expect(unit.isSuccess(i)).to.be.true;
      const receipt = unit.getRaw(i);
      expect(receipt).toBeInstanceOf(TransactionReceipt);
    }
  });

  test('Test of write calls - priority', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);
    const unit = new MulticallUnit(WALLET, {
      maxCallsStack: 5,
      highPriorityTxs: true,
    });

    for (let i = 0; i < 10; i++) {
      unit.add(i, storage.setCall(i));
    }
    const result = await unit.run();
    expect(result).to.be.true;

    for (let i = 0; i < 10; i++) {
      expect(unit.isSuccess(i)).to.be.true;
      const receipt = unit.getRaw(i);
      expect(receipt).toBeInstanceOf(TransactionReceipt);
    }
    const unique = new Set(unit.response);
    expect(unique.size).to.be.eq(2);
  });
});

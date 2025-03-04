import { describe, expect, test } from 'vitest';
import { TransactionReceipt, TransactionResponse } from 'ethers';
import { MulticallUnit } from '../../src/index.js';
import { waitForAddressTxs } from '../../src/helpers/index.js';
import { WALLET, SimpleStorage, MULTICALL_ADDRESS } from './ganache.stub.js';

const storage = new SimpleStorage(WALLET);

// noinspection t
describe('E2E Test of MulticallUnit - Testnet', () => {
  test('Test of write calls - do not wait', async () => {
    await waitForAddressTxs(WALLET.address, WALLET.provider);
    const unit = new MulticallUnit(
      WALLET,
      {
        maxMutableCallsStack: 20,
        waitForTxs: false,
      },
      MULTICALL_ADDRESS
    );

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
    const unit = new MulticallUnit(
      WALLET,
      {
        maxMutableCallsStack: 20,
      },
      MULTICALL_ADDRESS
    );

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
    const unit = new MulticallUnit(
      WALLET,
      {
        maxMutableCallsStack: 5,
        highPriorityTxs: true,
      },
      MULTICALL_ADDRESS
    );

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

  test('Test of mixed calls', async () => {
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

    for (let i = 0; i < 10; i++) {
      unit.add(`${i}-${i}`, storage.setCall(i));
      unit.add(`${i}-${i}-${i}`, storage.getGetCall());
    }
    const result = await unit.run();
    for (let i = 0; i < 10; i++) {
      expect(unit.getSingle(`${i}-${i}`)).to.be.undefined;
      expect(unit.getSingle(`${i}-${i}-${i}`)).to.be.eq(9n);
    }
    expect(result).to.be.true;
  });

  test('Read data', async () => {
    const unit = new MulticallUnit(
      WALLET,
      {
        maxCallsStack: 5,
      },
      MULTICALL_ADDRESS
    );

    for (let i = 0; i < 10; i++) {
      unit.add(i, storage.getGetCall(i));
    }
    const result = await unit.run();
    expect(result).to.be.true;

    for (let i = 0; i < 10; i++) {
      expect(unit.isSuccess(i)).to.be.true;
      const value = unit.getSingle(i);
      expect(value).to.be.eq(9n);
    }
  });
});

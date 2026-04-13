import { TransactionReceipt, TransactionResponse, ethers } from 'ethers';
import { describe, expect, test } from 'vitest';
import { MulticallUnit, waitForAddressPendingTxs } from '../../src/index.js';
import {
  MULTICALL_ADDRESS,
  MULTICALL_PROVIDER_PIGGY,
  PiggyBank,
  WALLET,
} from './anvil.mock.js';

const piggy = new PiggyBank(WALLET);
const oneEth = ethers.parseEther('1');
const halfEth = ethers.parseEther('0.5');

// ── BaseContract — direct payable calls ─────────────────────────────

describe('BaseContract — direct payable calls', () => {
  test('deposit sends ETH and updates contract balance', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const balanceBefore = await piggy.getBalance();

    const tx = await piggy.deposit({ overrides: { value: oneEth } });
    expect(tx).toBeInstanceOf(TransactionResponse);
    await tx.wait();

    const balanceAfter = await piggy.getBalance();
    expect(balanceAfter - balanceBefore).to.equal(oneEth);
  });

  test('deposit with highPriorityTx sends ETH correctly', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const countBefore = await piggy.getDepositCount();

    const tx = await piggy.deposit({
      overrides: { value: halfEth },
      highPriorityTx: true,
    });
    await tx.wait();

    const countAfter = await piggy.getDepositCount();
    expect(countAfter - countBefore).to.equal(1n);
  });

  test('gas estimate for payable method is accurate', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const estimate = await piggy.depositEstimate({
      overrides: { value: halfEth },
    });

    const tx = await piggy.deposit({ overrides: { value: halfEth } });
    const receipt = await tx.wait();

    expect(estimate).to.equal(receipt.gasUsed);
  });

  test('gas estimate with highPriorityTx is accurate', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const opts = {
      overrides: { value: halfEth },
      highPriorityTx: true,
    };

    const estimate = await piggy.depositEstimate(opts);
    const tx = await piggy.deposit(opts);
    const receipt = await tx.wait();

    expect(estimate).to.equal(receipt.gasUsed);
  });
});

// ── MulticallUnit — payable batching via aggregate3Value ────────────

describe('MulticallUnit — payable batching', () => {
  test('single payable call in batch succeeds', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const balanceBefore = await piggy.getBalance();

    const unit = new MulticallUnit(
      WALLET,
      { mutableBatchLimit: 5 },
      MULTICALL_ADDRESS
    );
    unit.add(piggy.depositCall(oneEth), 'deposit');

    const result = await unit.run();
    expect(result).to.be.true;
    expect(unit.isSuccess('deposit')).to.be.true;
    expect(unit.getTxReceipt('deposit')).toBeInstanceOf(TransactionReceipt);

    const balanceAfter = await piggy.getBalance();
    expect(balanceAfter - balanceBefore).to.equal(oneEth);
  });

  test('multiple payable calls batch with correct total value', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const balanceBefore = await piggy.getBalance();

    const unit = new MulticallUnit(
      WALLET,
      { mutableBatchLimit: 5 },
      MULTICALL_ADDRESS
    );
    unit.add(piggy.depositCall(halfEth), 'dep1');
    unit.add(piggy.depositCall(halfEth), 'dep2');

    const result = await unit.run();
    expect(result).to.be.true;
    expect(unit.isSuccess('dep1')).to.be.true;
    expect(unit.isSuccess('dep2')).to.be.true;

    const balanceAfter = await piggy.getBalance();
    expect(balanceAfter - balanceBefore).to.equal(oneEth);
  });

  test('mixed payable + view calls in a single batch', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const balanceBefore = await piggy.getBalance();

    const unit = new MulticallUnit(
      WALLET,
      { mutableBatchLimit: 5, staticBatchLimit: 5 },
      MULTICALL_ADDRESS
    );

    unit.add(piggy.depositCall(oneEth), 'payable');
    unit.add(piggy.getBalanceCall(), 'balance');
    unit.add(piggy.getDepositCountCall(), 'count');

    const result = await unit.run();
    expect(result).to.be.true;

    expect(unit.isSuccess('payable')).to.be.true;
    expect(unit.isSuccess('balance')).to.be.true;
    expect(unit.isSuccess('count')).to.be.true;

    // Static reads execute after mutable writes in run(),
    // so they reflect post-deposit state
    const readBalance = unit.getSingle('balance');
    expect(readBalance).to.equal(balanceBefore + oneEth);

    const readCount = unit.getSingle('count');
    expect(typeof readCount).to.equal('bigint');
  });

  test('payable batch with highPriorityTxs succeeds', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const unit = new MulticallUnit(
      WALLET,
      { mutableBatchLimit: 5, highPriorityTxs: true },
      MULTICALL_ADDRESS
    );
    unit.add(piggy.depositCall(halfEth), 'dep');

    const result = await unit.run();
    expect(result).to.be.true;
    expect(unit.isSuccess('dep')).to.be.true;
  });

  test('payable batch gas estimate is accurate', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const unit = new MulticallUnit(
      WALLET,
      { mutableBatchLimit: 5 },
      MULTICALL_ADDRESS
    );
    unit.add(piggy.depositCall(oneEth), 'dep1');
    unit.add(piggy.depositCall(halfEth), 'dep2');

    const [estimate] = await unit.estimateRun();
    expect(typeof estimate).to.equal('bigint');
    expect(estimate).to.be.gt(0n);

    await unit.run();
    const receipt = unit.getTxReceipt('dep1');
    expect(estimate).to.equal(receipt.gasUsed);
  });
});

// ── MulticallProvider — payable via sendTransaction ─────────────────

describe('MulticallProvider — payable sendTransaction', () => {
  test('deposit via MulticallProvider returns TransactionResponse', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const tx = await MULTICALL_PROVIDER_PIGGY['deposit']({
      value: halfEth,
    });

    expect(tx).toBeInstanceOf(TransactionResponse);
  });

  test('deposit via MulticallProvider updates contract state', async () => {
    await waitForAddressPendingTxs(WALLET.address, WALLET.provider);

    const countBefore = await piggy.getDepositCount();

    const tx = await MULTICALL_PROVIDER_PIGGY['deposit']({
      value: oneEth,
    });
    await tx.wait();

    const countAfter = await piggy.getDepositCount();
    expect(countAfter - countBefore).to.equal(1n);
  });
});

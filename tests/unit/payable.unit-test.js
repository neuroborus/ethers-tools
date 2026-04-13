import { Interface } from 'ethers';
import { describe, expect, test } from 'vitest';
import { BaseContract } from '../../src/contract/base-contract.js';
import { StateMutability } from '../../src/entities/index.js';
import { MulticallProvider } from '../../src/multicall/multicall-provider.js';
import { MulticallUnit } from '../../src/multicall/multicall-unit.js';
import { JSON_PROVIDER, JSON_WALLET } from '../e2e/mock.js';

const PayableAbi = [
  {
    inputs: [{ name: 'to', type: 'address' }],
    name: 'drip',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const payableIface = new Interface(PayableAbi);

/**
 * @param {string} method
 * @param {any[]} [args]
 * @param {bigint} [value]
 * @returns {import('../../types/entities').ContractCall}
 */
const makeContractCall = (method, args = [], value) => ({
  method,
  target: DEAD_ADDRESS,
  allowFailure: false,
  callData: payableIface.encodeFunctionData(method, args),
  stateMutability: value ? StateMutability.Payable : StateMutability.NonPayable,
  contractInterface: payableIface,
  ...(value !== undefined ? { value } : {}),
});

// ── BaseContract.getCall() ──────────────────────────────────────────

describe('BaseContract.getCall() with payable methods', () => {
  const contract = new BaseContract(PayableAbi, DEAD_ADDRESS, JSON_WALLET);

  test('payable call includes value when passed via callData spread', () => {
    const call = contract.getCall('drip', [DEAD_ADDRESS], { value: 100n });

    expect(call.value).to.equal(100n);
    expect(call.target).to.equal(DEAD_ADDRESS);
    expect(call.stateMutability).to.equal(StateMutability.Payable);
    expect(call.callData).to.be.a('string');
  });

  test('nonpayable call does not carry value', () => {
    const call = contract.getCall('withdraw');

    expect(call.value).to.be.undefined;
    expect(call.stateMutability).to.equal(StateMutability.NonPayable);
  });

  test('view call does not carry value', () => {
    const call = contract.getCall('totalSupply');

    expect(call.value).to.be.undefined;
    expect(call.stateMutability).to.equal(StateMutability.View);
  });

  test('value=0n is preserved as-is', () => {
    const call = contract.getCall('drip', [DEAD_ADDRESS], { value: 0n });

    expect(call.value).to.equal(0n);
  });
});

// ── MulticallUnit._prepareMutableBatch() ────────────────────────────

describe('MulticallUnit._prepareMutableBatch()', () => {
  const unit = new MulticallUnit(JSON_WALLET);

  test('picks aggregate3 for calls without value', () => {
    const calls = [makeContractCall('withdraw'), makeContractCall('withdraw')];
    const batch = unit._prepareMutableBatch(calls);

    expect(batch.method).to.equal('aggregate3');
    expect(batch.calls).to.equal(calls);
    expect(batch.overrides).to.be.undefined;
  });

  test('picks aggregate3Value when any call has value > 0n', () => {
    const calls = [
      makeContractCall('drip', [DEAD_ADDRESS], 100n),
      makeContractCall('withdraw'),
    ];
    const batch = unit._prepareMutableBatch(calls);

    expect(batch.method).to.equal('aggregate3Value');
    expect(batch.overrides).to.deep.equal({ value: 100n });
    expect(batch.calls).to.have.length(2);
    expect(batch.calls[0].value).to.equal(100n);
    expect(batch.calls[1].value).to.equal(0n);
  });

  test('sums total value across multiple payable calls', () => {
    const calls = [
      makeContractCall('drip', [DEAD_ADDRESS], 100n),
      makeContractCall('deposit', [], 200n),
      makeContractCall('withdraw'),
    ];
    const batch = unit._prepareMutableBatch(calls);

    expect(batch.method).to.equal('aggregate3Value');
    expect(batch.overrides).to.deep.equal({ value: 300n });
    expect(batch.calls[0].value).to.equal(100n);
    expect(batch.calls[1].value).to.equal(200n);
    expect(batch.calls[2].value).to.equal(0n);
  });

  test('aggregate3Value structs contain only Call3Value fields', () => {
    const calls = [makeContractCall('drip', [DEAD_ADDRESS], 50n)];
    const batch = unit._prepareMutableBatch(calls);

    expect(Object.keys(batch.calls[0]).sort()).to.deep.equal(
      ['allowFailure', 'callData', 'target', 'value'].sort()
    );
  });

  test('falls back to aggregate3 when all values are 0n', () => {
    const calls = [
      makeContractCall('drip', [DEAD_ADDRESS], 0n),
      makeContractCall('withdraw'),
    ];
    const batch = unit._prepareMutableBatch(calls);

    expect(batch.method).to.equal('aggregate3');
  });
});

// ── MulticallUnit run() routing ─────────────────────────────────────

describe('MulticallUnit.run() payable routing', () => {
  test('payable calls are not static', () => {
    const unit = new MulticallUnit(JSON_PROVIDER);

    unit.add(makeContractCall('drip', [DEAD_ADDRESS], 100n), 'payable');
    expect(unit.static).to.be.false;
  });

  test('adding a payable call to a view-only unit flips static to false', () => {
    const unit = new MulticallUnit(JSON_PROVIDER);

    unit.add(
      {
        target: DEAD_ADDRESS,
        allowFailure: false,
        callData: payableIface.encodeFunctionData('totalSupply'),
        stateMutability: StateMutability.View,
      },
      'view'
    );
    expect(unit.static).to.be.true;

    unit.add(makeContractCall('drip', [DEAD_ADDRESS], 100n), 'payable');
    expect(unit.static).to.be.false;
  });

  test('mutable batch with payable calls invokes aggregate3Value', async () => {
    const unit = new MulticallUnit(JSON_WALLET);
    unit.add(makeContractCall('drip', [DEAD_ADDRESS], 100n), 'drip');

    let capturedMethod;
    let capturedOverrides;

    const originalCall = unit.call.bind(unit);
    unit.call = async (method, _args, options) => {
      capturedMethod = method;
      capturedOverrides = options?.overrides;
      return { wait: async () => ({}) };
    };

    await unit.run({ waitForTxs: true });
    unit.call = originalCall;

    expect(capturedMethod).to.equal('aggregate3Value');
    expect(capturedOverrides).to.deep.equal({ value: 100n });
  });

  test('mutable batch without payable calls invokes aggregate3', async () => {
    const unit = new MulticallUnit(JSON_WALLET);
    unit.add(makeContractCall('withdraw'), 'withdraw');

    let capturedMethod;
    let capturedOverrides;

    const originalCall = unit.call.bind(unit);
    unit.call = async (method, _args, options) => {
      capturedMethod = method;
      capturedOverrides = options?.overrides;
      return { wait: async () => ({}) };
    };

    await unit.run({ waitForTxs: true });
    unit.call = originalCall;

    expect(capturedMethod).to.equal('aggregate3');
    expect(capturedOverrides).to.be.undefined;
  });
});

// ── MulticallProvider.sendTransaction() ─────────────────────────────

describe('MulticallProvider.sendTransaction() payable support', () => {
  /**
   * Intercepts the next MulticallUnit.add() call on the provider.
   * @param {MulticallProvider} provider
   * @returns {{ getAddedCall: () => object }}
   */
  const interceptAdd = (provider) => {
    let addedCall;
    const origAdd = provider._multicallUnit.add.bind(provider._multicallUnit);
    provider._multicallUnit.add = (call, tags) => {
      addedCall = call;
      return origAdd(call, tags);
    };
    return { getAddedCall: () => addedCall };
  };

  test('transaction with value produces a Payable ContractCall', () => {
    const provider = new MulticallProvider(JSON_WALLET);
    const { getAddedCall } = interceptAdd(provider);

    provider.sendTransaction({
      to: DEAD_ADDRESS,
      data: '0x12345678',
      value: 500n,
    });

    const call = getAddedCall();
    expect(call.value).to.equal(500n);
    expect(call.stateMutability).to.equal(StateMutability.Payable);
  });

  test('transaction without value produces a NonPayable ContractCall', () => {
    const provider = new MulticallProvider(JSON_WALLET);
    const { getAddedCall } = interceptAdd(provider);

    provider.sendTransaction({
      to: DEAD_ADDRESS,
      data: '0x12345678',
    });

    const call = getAddedCall();
    expect(call.value).to.be.undefined;
    expect(call.stateMutability).to.equal(StateMutability.NonPayable);
  });

  test('transaction with value=0n produces a NonPayable ContractCall', () => {
    const provider = new MulticallProvider(JSON_WALLET);
    const { getAddedCall } = interceptAdd(provider);

    provider.sendTransaction({
      to: DEAD_ADDRESS,
      data: '0x12345678',
      value: 0n,
    });

    const call = getAddedCall();
    expect(call.value).to.be.undefined;
    expect(call.stateMutability).to.equal(StateMutability.NonPayable);
  });
});

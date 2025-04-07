import { AbstractProvider } from 'ethers';
import { StateMutability } from '../entities/index.js';
import { config } from '../config.js';
import { isSigner } from '../helpers/index.js';
import { MULTICALL_ERRORS } from '../errors/index.js';
import { MulticallUnit } from './multicall-unit.js';

/**
 * MulticallProvider is a wrapper around an existing ethers.js Provider that batches
 * eth_call and sendTransaction requests using Multicall3 via MulticallUnit from ethers-tools.
 *
 * This provider is fully compatible with ethers.Contract and transparently reduces
 * the number of RPC calls by aggregating requests that occur within the same event loop tick.
 *
 * Features:
 * - Batches multiple calls (view & non-payable) into a single Multicall
 * - Defers execution until the next tick using setTimeout(0)
 * - Integrates cleanly with ethers.js v6 contract system
 * - Delegates all other provider methods to the wrapped base provider
 *
 * @example
 * const baseProvider = new JsonRpcProvider(...);
 * const provider = new MulticallProvider(baseProvider);
 * const contract = new BaseContract(address, abi, provider);
 * const result = await contract.totalSupply(); // Executed via multicall batching
 */
export class MulticallProvider extends AbstractProvider {
  /**
   * The base driver used for multicall.
   * @private
   * @type {import('ethers').Signer | import('ethers').Provider}
   */
  _driver;
  /**
   * The base provider used for delegation.
   * @private
   * @type {import('ethers').Provider}
   */
  _baseProvider;
  /**
   * Internal multicall batching unit.
   * @private
   * @type {import('../../types/multicall').MulticallUnit}
   */
  _multicallUnit;
  /**
   * Multicall options.
   * @private
   * @type {import('../../types/entities').MulticallOptions | undefined}
   */
  _multicallOptions;
  /**
   * Optional Multicall3 contract address override.
   * @private
   * @type {string | undefined}
   */
  _multicallAddress;
  /**
   * Indicates whether a batch execution is scheduled.
   * @private
   * @type {boolean}
   */
  _batchScheduled = false;

  /**
   * Internal handler for all standard provider actions (used by ethers.js v6).
   * This method intercepts specific methods (like 'call') and delegates the rest
   * to the underlying base provider's _perform method.
   *
   * @public
   * @typedef {import('ethers').PerformActionRequest} req - A PerformActionRequest as passed by ethers.js internals.
   * @param {string} req.method - The name of the JSON-RPC-like method to perform.
   * @returns {Promise<any>} The result of the requested action.
   */
  _perform(req) {
    switch (req.method) {
      // 'sendTransaction' is a Signer part
      case 'call':
        return this.call(req);
      default:
        return this._baseProvider['_perform'](req); // Delegation
    }
  }

  /**
   * @protected
   * @returns {Promise<import('ethers').Network>}
   */
  async _detectNetwork() {
    return this._baseProvider.getNetwork();
  }

  /**
   * @param {import('ethers').Signer | import('ethers').Provider} driver - Base provider to wrap
   * @param {MulticallOptions} [options] - Optional multicall configuration
   * @param {string} [multicallAddress] - Optional multicall address
   */
  constructor(driver, options, multicallAddress) {
    super();
    this._driver = driver;
    this._baseProvider = isSigner(driver) ? driver.provider : driver;
    this._multicallOptions = options;
    this._multicallAddress = multicallAddress;
    this._multicallUnit = new MulticallUnit(driver, options, multicallAddress);
  }

  /**
   * Batches a read-only call (eth_call) to be executed via MulticallUnit.
   *
   * @param {import('ethers').TransactionRequest} transaction - Request with encoded data and interface in customData
   * @returns {Promise<string>} - Result data as hex string
   */
  async call(transaction) {
    const callData = transaction.data?.toString();
    if (!transaction.to || !callData)
      throw MULTICALL_ERRORS.MISSING_PROVIDER_CALL_DATA;

    const call = {
      target: transaction.to.toString(),
      allowFailure: config.multicallUnit.allowFailure,
      callData,
      stateMutability: StateMutability.View,
    };

    const tag = this._multicallUnit.add(call);
    this._scheduleRun();

    return this._multicallUnit.waitRawOrThrow(tag); // String because of View mutability
  }

  /**
   * Batches a transaction request to be sent via MulticallUnit.
   *
   * @param {import('ethers').TransactionRequest} transaction - A TransactionRequest with contractInterface in customData
   * @returns {Promise<import('ethers').TransactionResponse>}
   */
  async sendTransaction(transaction) {
    const callData = transaction.data?.toString();
    if (!transaction.to || !callData)
      throw MULTICALL_ERRORS.MISSING_PROVIDER_CALL_DATA;

    const call = {
      target: transaction.to.toString(),
      allowFailure: config.multicallUnit.allowFailure,
      callData,
      stateMutability: StateMutability.NonPayable,
    };

    const tag = this._multicallUnit.add(call);
    this._scheduleRun();

    return this._multicallUnit.waitTxOrThrow(tag);
  }

  /**
   * Internal method to defer batch execution to next event loop tick.
   * @private
   */
  _scheduleRun() {
    if (!this._batchScheduled) {
      this._batchScheduled = true;
      setTimeout(() => this._runBatch(), 0);
    }
  }

  /**
   * Executes all accumulated calls in the batch.
   * @private
   * @returns {Promise<void>}
   */
  async _runBatch() {
    const unit = this._multicallUnit;
    this._multicallUnit = new MulticallUnit(
      this._driver,
      this._multicallOptions,
      this._multicallAddress
    );
    this._batchScheduled = false;

    await unit.run().catch(); // We will get these errors via orThrow methods
  }
}

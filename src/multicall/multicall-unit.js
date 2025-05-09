import { TransactionReceipt } from 'ethers';
import { EventEmitter } from 'node:events';
import { Multicall3Abi } from '../abis/index.js';
import { CallMutability } from '../entities/index.js';
import { config } from '../config.js';
import { isParsable, isStaticArray } from '../helpers/index.js';
import { MULTICALL_ERRORS } from '../errors/index.js';
import { BaseContract } from '../contract/index.js';
import {
  checkSignals,
  createTimeoutSignal,
  raceWithSignals,
  waitWithSignals,
} from '../utils/index.js';
import { multicallErrorEventName } from './multicall-error-event-name.js';
import { multicallGenerateTag } from './multicall-generate-tag.js';
import { multicallNormalizeTags } from './multicall-normalize-tags.js';
import { multicallResultEventName } from './multicall-result-event-name.js';
import { multicallSplitCalls } from './multicall-split-calls.js';

const aggregate3 = 'aggregate3';

/**
 * MulticallUnit extends the BaseContract class to support batching multiple contract calls
 * into a single transaction or RPC call using the Multicall3 standard.
 * It supports static and mutable calls, result tagging, and decoding.
 */
export class MulticallUnit extends BaseContract {
  /**
   * Stores tagged contract calls.
   * @protected
   * @type {Map<import('../../types/entities').Tagable, ContractCall>}
   */
  _units = new Map();
  /**
   * Stores raw responses from multicall (success flags and data).
   * @protected
   * @type {import('../../types/multicall').MulticallResponse[]}
   */
  _response = [];
  /**
   * Stores raw data from each tagged result.
   * @Protected
   * @type {Map<import('../../types/entities').Tagable, string>}
   */
  _rawData = new Map();
  /**
   * Stores TransactionResponse for each mutable call.
   * @protected
   * @readonly
   * @type {Map<import('../../types/entities').Tagable, import('ethers').TransactionResponse>}
   */
  _txResponses = new Map();
  /**
   * Stores TransactionReceipt for each mutable call.
   * @protected
   * @readonly
   * @type {Map<import('../../types/entities').Tagable, import('ethers').TransactionReceipt>}
   */
  _txReceipts = new Map();
  /**
   * Stores success status for each call tag.
   * @protected
   * @type {Map<import('../../types/entities').Tagable, boolean>}
   */
  _callsSuccess = new Map();
  /**
   * Inner events emitter.
   * @protected
   * @readonly
   * @type {EventEmitter}
   */
  _emitter = new EventEmitter();
  /**
   * Last overall success status of multicall execution.
   * @protected
   * @type {boolean | undefined}
   */
  _lastSuccess;
  /**
   * Whether multicall execution is currently in progress.
   * @protected
   * @type {boolean}
   */
  _isExecuting = false;
  /**
   * Multicall configuration options.
   * @protected
   * @readonly
   * @type {import('../../types/entities').MulticallOptions}
   */
  _multicallOptions = {};

  /**
   * @param {import('ethers').Provider | import('ethers').Signer} driver
   * @param {import('../../types/entities').MulticallOptions} [options={}]
   * @param {string} [multicallAddress=MULTICALL_ADDRESS]
   */
  constructor(
    driver,
    options = {},
    multicallAddress = config.multicallUnit.address
  ) {
    super(Multicall3Abi, multicallAddress, driver);
    this._multicallOptions = {
      maxStaticCallsStack: config.multicallUnit.staticCalls.batchLimit,
      maxMutableCallsStack: config.multicallUnit.mutableCalls.batchLimit,
      waitForTxs: config.multicallUnit.waitForTxs,
      waitCallsTimeoutMs: config.multicallUnit.waitCalls.timeoutMs,
      batchDelayMs: config.multicallUnit.batchDelayMs,
      ...options,
    };
  }

  /**
   * Resets internal state: clears stored calls, responses, and results.
   * @public
   * @returns {void}
   */
  clear() {
    this._units = new Map();
    this._response = [];
    this._rawData = new Map();
    this._callsSuccess = new Map();
    this._lastSuccess = undefined;
  }

  /**
   * Adds a contract call to the batch with associated tags.
   * @public
   * @param {import('../../types/entities').ContractCall} contractCall
   * @param {import('../../types/entities').MulticallTags} [tags=multicallGenerateTag()]
   * @returns {import('../../types/entities').MulticallTags}
   */
  add(contractCall, tags = multicallGenerateTag()) {
    this._units.set(multicallNormalizeTags(tags), contractCall);
    return tags;
  }

  /**
   * Adds a batch of contract call with associated tags.
   * @public
   * @param {import('../../types/entities').MulticallAssociatedCall[]} associatedCalls
   * @returns {import('../../types/entities').MulticallTags[]}
   */
  addBatch(associatedCalls) {
    return associatedCalls.map((c) => this.add(c.call, c.tags));
  }

  /**
   * Returns the list of normalized tags in order of addition.
   * @public
   * @returns {import('../../types/entities').Tagable[]}
   */
  get tags() {
    return Array.from(this._units.keys()); // The order is guaranteed
  }
  /**
   * Returns the list of added contract calls in order of addition.
   * @public
   * @returns {import('../../types/entities').ContractCall[]}
   */
  get calls() {
    return Array.from(this._units.values()); // The order is guaranteed
  }
  /**
   * Returns the raw response array for all calls.
   * @public
   * @returns {import('../../types/multicall').MulticallResponse[]}
   */
  get response() {
    return this._response;
  }
  /**
   * Returns whether the last multicall run succeeded entirely.
   * @public
   * @returns {boolean | undefined}
   */
  get success() {
    return this._lastSuccess;
  }
  /**
   * Determines whether all current calls are static.
   * @public
   * @returns {boolean}
   */
  get static() {
    if (!this._units.size) return true;
    return isStaticArray(this.calls);
  }
  /**
   * Indicates if a multicall run is in progress.
   * @public
   * @returns {boolean}
   */
  get executing() {
    return this._isExecuting;
  }

  /**
   * Returns success status for a specific tag.
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {boolean | undefined}
   */
  isSuccess(tags) {
    return this._callsSuccess.get(multicallNormalizeTags(tags));
  }

  /**
   * @private
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {import('../../types/multicall').MulticallDecodableData | null}
   */
  _getDecodableData(tags) {
    const nTags = multicallNormalizeTags(tags);
    const rawData = this._rawData.get(nTags);
    const call = this._units.get(nTags);
    if (
      rawData === undefined ||
      !call ||
      !isParsable(call) ||
      !this.isSuccess(nTags)
    )
      return null;
    return {
      call,
      rawData,
    };
  }

  /**
   * Decodes and returns a smart result for the given tag.
   * Automatically chooses the most appropriate return format based on ABI:
   * - If the method has exactly one output (e.g. returns address or address[]), that value is returned directly.
   * - If all outputs are named (e.g. returns (uint id, address user)), an object is returned.
   * - Otherwise, an array of values is returned.
   *
   * If the call is mutable, and returns a transaction or receipt instead of data, it is returned as-is.
   * @template T
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {boolean} [deep=false]
   * @returns {T | null}
   */
  get(tags, deep = false) {
    {
      const raw = this.getRaw(tags);
      if (raw === null) return null;
      // if (typeof raw !== 'string') return raw; // Transaction or Receipt for mutable call
    }

    const data = this._getDecodableData(tags);
    if (!data) return null;

    const decoded = data.call.contractInterface.decodeFunctionResult(
      data.call.method,
      data.rawData
    );
    const outputs = data.call.contractInterface.getFunction(
      data.call.method
    ).outputs;
    if (!outputs || outputs.length === 0) {
      return null;
    }
    // Only one output - returns just single (sometimes can work with arrays (like [address[]]))
    if (outputs.length === 1) {
      return decoded[0];
    }
    // Outputs are named in ABI - object can be formed
    // If output is named - object is preferable
    if (outputs.every((param) => !!param.name)) {
      return decoded.toObject(deep);
    }
    // In other case - return array
    return decoded.toArray(deep);
  }
  /**
   * Like get(), but throws if the result is not found or cannot be decoded.
   * @template T
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {boolean} [deep=false]
   * @returns {T}
   */
  getOrThrow(tags, deep = false) {
    const value = this.get(tags, deep);
    if (value === null) throw MULTICALL_ERRORS.RESULT_NOT_FOUND;
    return value;
  }

  /**
   * Returns an array of all decoded results.
   * @template T
   * @param {boolean} [deep=false]
   * @returns {T}
   */
  getAll(deep = false) {
    return this.tags.map((tag) => this.get(tag, deep));
  }
  /**
   * Like getAll(), but throws if any result is not found.
   * @template T
   * @param {boolean} [deep=false]
   * @returns {T}
   */
  getAllOrThrow(deep = false) {
    return this.tags.map((tag) => this.getOrThrow(tag, deep));
  }

  /**
   * Returns a single decoded value (first output).
   * @template T
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {T | null}
   */
  getSingle(tags) {
    const data = this._getDecodableData(tags);
    if (!data) return null;
    const [value] = data.call.contractInterface.decodeFunctionResult(
      data.call.method,
      data.rawData
    );
    return value;
  }
  /**
   * Like getSingle(), but throws if result is not found.
   * @template T
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {T}
   */
  getSingleOrThrow(tags) {
    const single = this.getSingle(tags);
    if (single === null) throw MULTICALL_ERRORS.RESULT_NOT_FOUND;
    return single;
  }

  /**
   * Returns decoded result - tuple as an array.
   * @template T
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {boolean} [deep=false]
   * @returns {T | null}
   */
  getArray(tags, deep = false) {
    const data = this._getDecodableData(tags);
    if (data === null) return null;
    return data.call.contractInterface
      .decodeFunctionResult(data.call.method, data.rawData)
      .toArray(deep);
  }
  /**
   * Like getArray(), but throws if result is not found.
   * @template T
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {boolean} [deep=false]
   * @returns {T}
   */
  getArrayOrThrow(tags, deep = false) {
    const array = this.getArray(tags, deep);
    if (array === null) throw MULTICALL_ERRORS.RESULT_NOT_FOUND;
    return array;
  }
  /**
   * Returns decoded result - tuple as an object.
   * @template T
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {boolean} [deep=false]
   * @returns {T | null}
   */
  getObject(tags, deep = false) {
    const data = this._getDecodableData(tags);
    if (data === null) return null;
    const decoded = data.call.contractInterface.decodeFunctionResult(
      data.call.method,
      data.rawData
    );

    return decoded.toObject(deep);
  }
  /**
   * Like getObject(), but throws if result is not found.
   * @template T
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {boolean} [deep=false]
   * @returns {T}
   */
  getObjectOrThrow(tags, deep) {
    const obj = this.getObject(tags, deep);
    if (obj === null) throw MULTICALL_ERRORS.RESULT_NOT_FOUND;
    return obj;
  }
  /**
   * Returns raw result data for a specific tag.
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {string | null}
   */
  getRaw(tags) {
    return this._rawData.get(multicallNormalizeTags(tags)) ?? null;
  }
  /**
   * Returns raw result data for a specific tag.
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {string | import('ethers').TransactionResponse | import('ethers').TransactionReceipt | undefined}
   */
  getRawOrThrow(tags) {
    const raw = this.getRaw(tags);
    if (raw === null) return null;
    return raw;
  }
  /**
   * Returns TransactionResponse for the mutable call.
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {import('ethers').TransactionResponse | null}
   */
  getTxResponse(tags) {
    return this._txResponses.get(multicallNormalizeTags(tags)) ?? null;
  }
  /**
   * Returns TransactionResponse for the mutable call or throws.
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {import('ethers').TransactionResponse}
   */
  getTxResponseOrThrow(tags) {
    const response = this.getTxResponse(tags);
    if (response === null) throw MULTICALL_ERRORS.RESPONSE_NOT_FOUND;
    return response;
  }
  /**
   * Returns TransactionReceipt for the mutable call.
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {import('ethers').TransactionReceipt | null}
   */
  getTxReceipt(tags) {
    return this._txReceipts.get(multicallNormalizeTags(tags)) ?? null;
  }
  /**
   * Returns TransactionReceipt for the mutable call or throws.
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {import('ethers').TransactionReceipt}
   */
  getTxReceiptOrThrow(tags) {
    const receipt = this._txReceipts.get(multicallNormalizeTags(tags)) ?? null;
    if (receipt === null) throw MULTICALL_ERRORS.RECEIPT_NOT_FOUND;
    return receipt;
  }

  /**
   * Waiting for the specific call end.
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {import('../../types/entities').MulticallWaitOptions} [options]
   * @returns {Promise<void>}
   */
  wait(tags, options) {
    const signals = options?.signals ?? [];
    if (options?.timeoutMs)
      signals.push(createTimeoutSignal(options.timeoutMs));

    const nTags = multicallNormalizeTags(tags);
    return raceWithSignals(
      () =>
        new Promise((resolve, reject) => {
          const resultEvent = multicallResultEventName(nTags);
          const errorEvent = multicallErrorEventName(nTags);

          const onResult = () => {
            cleanup();
            resolve();
          };
          const onError = (error) => {
            cleanup();
            reject(error);
          };

          const cleanup = () => {
            this._emitter.removeListener(resultEvent, onResult);
            this._emitter.removeListener(errorEvent, onError);
          };

          this._emitter.once(resultEvent, onResult);
          this._emitter.once(errorEvent, onError);
        }),
      signals
    );
  }
  /**
   * Waiting for the specific call.
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {import('../../types/entities').MulticallWaitOptions} [options]
   * @returns {Promise<string | null>}
   */
  async waitRaw(tags, options) {
    const nTags = multicallNormalizeTags(tags);
    // 1. If result exists - just return
    {
      const result = this._rawData.get(nTags);
      if (result) return result;
    }
    if (this._txResponses.has(nTags)) {
      return null;
    }

    // 2. Or wait for event
    await this.wait(tags, options);
    return this.getRaw(nTags);
  }

  /**
   * Waiting for the specific call.
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {import('../../types/entities').MulticallWaitOptions} [options]
   * @returns {Promise<string>}
   */
  async waitRawOrThrow(tags, options) {
    const raw = await this.waitRaw(tags, options);
    if (raw === null) throw MULTICALL_ERRORS.RESULT_NOT_FOUND;
    return raw;
  }

  /**
   * Waiting for the specific TransactionResponse.
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {import('../../types/entities').MulticallWaitOptions} [options]
   * @returns {Promise<import('ethers').TransactionResponse | null>}
   */
  async waitTx(tags, options) {
    const nTags = multicallNormalizeTags(tags);
    // 1. If result exists - just return
    {
      const result = this._txResponses.get(nTags);
      if (result) return result;
    }
    if (this._rawData.has(nTags)) {
      return null;
    }

    // 2. Or wait for event
    await this.wait(tags, options);
    return this.getTxResponse(nTags);
  }
  /**
   * Waiting for the specific TransactionResponse or throws.
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {import('../../types/entities').MulticallWaitOptions} [options]
   * @returns {Promise<import('ethers').TransactionResponse>}
   */
  async waitTxOrThrow(tags, options) {
    const tx = await this.waitTx(tags, options);
    if (tx === null) throw MULTICALL_ERRORS.RESULT_NOT_FOUND;
    return tx;
  }
  /**
   * Waiting for the specific TransactionReceipt.
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {import('../../types/entities').MulticallWaitOptions} [options]
   * @returns {Promise<import('ethers').TransactionReceipt | null>}
   */
  async waitReceipt(tags, options) {
    const nTags = multicallNormalizeTags(tags);
    // 1. If result exists - just return
    {
      const result = this._txReceipts.get(nTags);
      if (result) return result;
    }
    if (this._rawData.has(nTags)) {
      return null;
    }

    // 2. Or wait for event
    await this.wait(tags, options);
    return this.getTxReceipt(nTags);
  }
  /**
   * Waiting for the specific TransactionReceipt or throws.
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {import('../../types/entities').MulticallWaitOptions} [options]
   * @returns {Promise<import('ethers').TransactionReceipt>}
   */
  async waitReceiptOrThrow(tags, options) {
    const receipt = await this.waitReceipt(tags, options);
    if (receipt === null) throw MULTICALL_ERRORS.RESULT_NOT_FOUND;
    return receipt;
  }
  /**
   * Waiting for the call result.
   * @template T
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {import('../../types/entities').MulticallWaitOptions} [options]
   * @returns {Promise<T>}
   */
  async waitFor(tags, options) {
    const nTags = multicallNormalizeTags(tags);
    if (this._rawData.has(nTags)) {
      return this.get(tags, options?.deep);
    }
    await this.wait(tags, options);
    return this.get(tags, options?.deep);
  }

  /**
   * Waiting for the call result and throw or not found.
   * @template T
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {import('../../types/entities').MulticallWaitOptions} [options]
   * @returns {Promise<T>}
   */
  async waitForOrThrow(tags, options) {
    const result = await this.waitFor(tags, options);
    if (result === null) throw MULTICALL_ERRORS.RESULT_NOT_FOUND;
    return result;
  }

  /**
   * Executes all added calls in batches, depending on their mutability.
   * Fills internal response state, handles signal support and batch limits.
   * @public
   * @param {import('../../types/entities').MulticallOptions} [options={}]
   * @returns {Promise<boolean>}
   */
  async run(options = {}) {
    const runOptions = {
      ...this._multicallOptions,
      ...options,
    };

    if (this._isExecuting) throw MULTICALL_ERRORS.SIMULTANEOUS_INVOCATIONS;

    this._isExecuting = true;
    this._lastSuccess = undefined;
    const tags = this.tags;
    const calls = this.calls;
    this._response = Array(tags.length).fill([undefined, null]);

    try {
      checkSignals(runOptions.signals);

      const {
        staticCalls,
        staticIndexes,
        mutableCalls,
        mutableTags,
        mutableIndexes,
      } = this._splitCalls(calls, tags, options.forceMutability);

      // Process mutable
      for (
        let i = 0;
        i < mutableCalls.length;
        i += runOptions.maxMutableCallsStack
      ) {
        checkSignals(runOptions.signals);

        const border = Math.min(
          i + runOptions.maxMutableCallsStack,
          mutableCalls.length
        );
        const iterationCalls = mutableCalls.slice(i, border); // half-opened interval
        const iterationTags = mutableTags.slice(i, border);
        const iterationIndexes = mutableIndexes.slice(i, border); // half-opened interval

        const iterationResponse = await this._processMutableCalls(
          iterationCalls,
          iterationTags,
          runOptions
        );

        this._saveResponse(iterationResponse, iterationIndexes, tags);
        await waitWithSignals(runOptions.batchDelayMs, runOptions.signals);
      }

      // Process static
      for (
        let i = 0;
        i < staticCalls.length;
        i += runOptions.maxStaticCallsStack
      ) {
        checkSignals(runOptions.signals);

        const border = Math.min(
          i + runOptions.maxStaticCallsStack,
          staticCalls.length
        );
        const iterationCalls = staticCalls.slice(i, border); // half-opened interval
        const iterationIndexes = staticIndexes.slice(i, border); // half-opened interval

        const iterationResponse = await this._processStaticCalls(
          iterationCalls,
          runOptions
        );

        this._saveResponse(iterationResponse, iterationIndexes, tags);
        await waitWithSignals(runOptions.batchDelayMs, runOptions.signals);
      }
    } catch (error) {
      this._lastSuccess = false;
      tags.forEach((tag) =>
        this._emitter.emit(multicallErrorEventName(tag), error)
      ); // For unlock all the waiters
      throw error;
    } finally {
      this._isExecuting = false;
    }
    return this._lastSuccess;
  }

  /**
   * Estimates gas usage for all mutable calls in the multicall queue, processed in batches.
   * Static calls are ignored during estimation. Handles batch size limits and signal-based aborts.
   * @public
   * @param {import('../../types/entities').MulticallOptions} [options={}]
   * @returns {Promise<bigint[]>}
   */
  async estimateRun(options = {}) {
    const runOptions = {
      ...this._multicallOptions,
      ...options,
    };

    const tags = this.tags;
    const calls = this.calls;

    checkSignals(runOptions.signals);

    const {
      _staticCalls,
      _staticIndexes,
      mutableCalls,
      mutableTags,
      _mutableIndexes,
    } = this._splitCalls(calls, tags, options.forceMutability);

    const estimates = [];

    // Process mutable
    for (
      let i = 0;
      i < mutableCalls.length;
      i += runOptions.maxMutableCallsStack
    ) {
      checkSignals(runOptions.signals);

      const border = Math.min(
        i + runOptions.maxMutableCallsStack,
        mutableCalls.length
      );
      const iterationCalls = mutableCalls.slice(i, border); // half-opened interval
      const iterationTags = mutableTags.slice(i, border);

      const estimation = await this._estimateMutableCallsBatch(
        iterationCalls,
        iterationTags,
        runOptions
      );
      estimates.push(estimation);
    }

    return estimates;
  }

  /**
   * @private
   * @param {import('../../types/entities').ContractCall[]} calls
   * @param {import('../../types/entities').Tagable[]} tags
   * @param {import('../../types/entities').CallMutability} [forceMutability]
   * @returns {import('../../types/entities').SplitCalls}
   */
  _splitCalls(calls, tags, forceMutability) {
    let staticCalls;
    let staticIndexes;
    let mutableCalls;
    let mutableTags;
    let mutableIndexes;

    if (forceMutability) {
      if (forceMutability === CallMutability.Static) {
        staticCalls = calls;
        staticIndexes = Array.from({ length: calls.length }, (_, i) => i);
        mutableCalls = [];
        mutableTags = [];
        mutableIndexes = [];
      } else {
        staticCalls = [];
        staticIndexes = [];
        mutableCalls = calls;
        mutableTags = tags;
        mutableIndexes = Array.from({ length: calls.length }, (_, i) => i);
      }
    } else {
      const split = multicallSplitCalls(calls, tags);
      staticCalls = split.staticCalls;
      staticIndexes = split.staticIndexes;
      mutableCalls = split.mutableCalls;
      mutableTags = split.mutableTags;
      mutableIndexes = split.mutableIndexes;
    }

    return {
      staticCalls,
      staticIndexes,
      mutableCalls,
      mutableTags,
      mutableIndexes,
    };
  }

  /**
   * @private
   * @param {import('../../types/entities').ContractCall[]} iterationCalls
   * @param {import('../../types/entities').MulticallOptions} runOptions
   * @returns {Promise<import('../../types/multicall').MulticallResponse[]>}
   */
  async _processStaticCalls(iterationCalls, runOptions) {
    const result = await this.call(aggregate3, [iterationCalls], {
      forceMutability: CallMutability.Static,
      signals: runOptions.signals,
      timeoutMs: runOptions.staticCallsTimeoutMs,
    });
    this._lastSuccess = !(this._lastSuccess === false);

    return result;
  }

  /**
   * @private
   * @param {import('../../types/entities').ContractCall[]} iterationCalls
   * @param {import('../../types/entities').Tagable[]} iterationTags
   * @param {import('../../types/entities').MulticallOptions} runOptions
   * @returns {Promise<import('../../types/multicall').MulticallResponse[]>}
   */
  async _processMutableCalls(iterationCalls, iterationTags, runOptions) {
    let result;
    const tx = await this.call(aggregate3, [iterationCalls], {
      forceMutability: CallMutability.Mutable,
      highPriorityTx: runOptions.highPriorityTxs,
      priorityOptions: runOptions.priorityOptions,
      signals: runOptions.signals,
      timeoutMs: runOptions.mutableCallsTimeoutMs,
    });
    iterationTags.forEach((tag) => this._txResponses.set(tag, tx));
    if (runOptions.waitForTxs) {
      const receipt = await raceWithSignals(
        () => tx.wait(),
        runOptions.signals
      );
      if (!receipt) {
        result = Array(iterationCalls.length).fill([false, null]);
        this._lastSuccess = false;
      } else {
        result = Array(iterationCalls.length).fill([true, receipt]);
        this._lastSuccess = !(this._lastSuccess === false);
        iterationTags.forEach((tag) => this._txReceipts.set(tag, receipt));
      }
    } else {
      result = Array(iterationCalls.length).fill([true, tx]);
      this._lastSuccess = !(this._lastSuccess === false);
    }
    return result;
  }

  /**
   * @private
   * @param {import('../../types/entities').ContractCall[]} iterationCalls
   * @param {import('../../types/entities').Tagable[]} iterationTags
   * @param {import('../../types/entities').MulticallOptions} runOptions
   * @returns {Promise<bigint>}
   */
  async _estimateMutableCallsBatch(iterationCalls, iterationTags, runOptions) {
    return this.estimate(aggregate3, [iterationCalls], {
      forceMutability: CallMutability.Mutable,
      highPriorityTx: runOptions.highPriorityTxs,
      priorityOptions: runOptions.priorityOptions,
      signals: runOptions.signals,
      timeoutMs: runOptions.mutableCallsTimeoutMs,
    });
  }

  /**
   * @private
   * @param {import('../../types/multicall').MulticallResponse[]} iterationResponse
   * @param {number[]} iterationIndexes
   * @param {import('../../types/entities').Tagable[]} globalTags // Normalized
   * @returns {void}
   */
  _saveResponse(iterationResponse, iterationIndexes, globalTags) {
    iterationResponse.forEach((el, index) => {
      const [success, data] = el;
      const globalIndex = iterationIndexes[index];
      const tag = globalTags[globalIndex]; // Normalized
      if (!success) this._lastSuccess = false;
      if (typeof data === 'string') this._rawData.set(tag, data);
      this._callsSuccess.set(tag, success);
      this._response[globalIndex] = el;
      this._emitter.emit(multicallResultEventName(tag));
    });
  }
}

import { TransactionReceipt } from 'ethers';
import { Multicall3Abi } from '../abis/index.js';
import { CallMutability } from '../entities/index.js';
import { config } from '../config.js';
import { isStaticArray } from '../helpers/index.js';
import { MULTICALL_ERRORS } from '../errors/index.js';
import { Contract } from '../contract/index.js';
import { checkSignals, raceWithSignals } from '../utils/index.js';
import { multicallGenerateTag } from './multicall-generate-tag.js';
import { multicallNormalizeTags } from './multicall-normalize-tags.js';
import { multicallSplitCalls } from './multicall-split-calls.js';

const aggregate3 = 'aggregate3';

export class MulticallUnit extends Contract {
  /**
   * @protected
   * @readonly
   * @type {Map<import('../../types/entities').Tagable, ContractCall>}
   */
  _units = new Map();
  /**
   * @protected
   * @readonly
   * @type {import('../../types/multicall').MulticallResponse[]}
   */
  _response = [];
  /**
   * @protected
   * @readonly
   * @type {Map<import('../../types/entities').Tagable, string>}
   */
  _rawData = new Map();
  /**
   * @protected
   * @readonly
   * @type {Map<import('../../types/entities').Tagable, boolean>}
   */
  _callsSuccess = new Map();
  /**
   * @protected
   * @type {boolean | undefined}
   */
  _lastSuccess;
  /**
   * @protected
   * @type {boolean}
   */
  _isExecuting = false;
  /**
   * @protected
   * @readonly
   * @type {import('../../types/entities').MulticallOptions}
   */
  _multicallOptions = {};

  /**
   * @param {import('ethers').Provider | import('ethers').Signer | undefined} driver
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
      maxStaticCallsStack: config.multicallUnit.staticCalls.stackLimit,
      maxMutableCallsStack: config.multicallUnit.mutableCalls.stackLimit,
      waitForTxs: config.multicallUnit.waitForTxs,
      waitCallsTimeoutMs: config.multicallUnit.waitCalls.timeoutMs,
      ...options,
    };
  }

  /**
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
   * @public
   * @returns {import('../../types/entities').Tagable[]}
   */
  get tags() {
    return Array.from(this._units.keys()); // The order is guaranteed
  }
  /**
   * @public
   * @returns {import('../../types/entities').ContractCall[]}
   */
  get calls() {
    return Array.from(this._units.values()); // The order is guaranteed
  }
  /**
   * @public
   * @returns {import('../../types/multicall').MulticallResponse[]}
   */
  get response() {
    return this._response;
  }
  /**
   * @public
   * @returns {boolean | undefined}
   */
  get success() {
    return this._lastSuccess;
  }
  /**
   * @public
   * @returns {boolean}
   */
  get static() {
    if (!this._units.size) return true;
    return isStaticArray(this.calls);
  }
  /**
   * @public
   * @returns {boolean}
   */
  get executing() {
    return this._isExecuting;
  }

  /**
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {boolean | undefined}
   */
  isSuccess(tags) {
    return this._callsSuccess.get(multicallNormalizeTags(tags));
  }
  /**
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {string | import('ethers').TransactionResponse | import('ethers').TransactionReceipt | undefined}
   */
  getRaw(tags) {
    return this._rawData.get(multicallNormalizeTags(tags));
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
      !rawData ||
      typeof rawData !== 'string' || // rawData should be a string if it contains decodable data
      !call ||
      !this.isSuccess(nTags)
    )
      return null;
    return {
      call,
      rawData,
    };
  }

  /**
   * @template T
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {T | undefined}
   */
  getSingle(tags) {
    const data = this._getDecodableData(multicallNormalizeTags(tags));
    if (!data) return undefined;
    const [value] = data.call.contractInterface.decodeFunctionResult(
      data.call.method,
      data.rawData
    );
    return value;
  }
  /**
   * @template T
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {T}
   */
  getSingleOrThrow(tags) {
    const single = this.getSingle(tags);
    if (!single) throw MULTICALL_ERRORS.RESULT_NOT_FOUND;
    return single;
  }

  /**
   * @template T
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {boolean} [deep=false]
   * @returns {T | undefined}
   */
  getArray(tags, deep = false) {
    const data = this._getDecodableData(multicallNormalizeTags(tags));
    if (!data) return undefined;
    const [array] = data.call.contractInterface
      .decodeFunctionResult(data.call.method, data.rawData)
      .toArray(deep);
    return array;
  }
  /**
   * @template T
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {boolean} [deep=false]
   * @returns {T}
   */
  getArrayOrThrow(tags, deep = false) {
    const array = this.getArray(tags, deep);
    if (!array) throw MULTICALL_ERRORS.RESULT_NOT_FOUND;
    return array;
  }

  /**
   * @template T
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {boolean} [deep=false]
   * @returns {T | undefined}
   */
  getObject(tags, deep = false) {
    const data = this._getDecodableData(multicallNormalizeTags(tags));
    if (!data) return undefined;
    const decoded = data.call.contractInterface.decodeFunctionResult(
      data.call.method,
      data.rawData
    );

    return decoded.toObject(deep);
  }
  /**
   * @template T
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {T}
   */
  getObjectOrThrow(tags) {
    const obj = this.getObject(tags);
    if (!obj) throw MULTICALL_ERRORS.RESULT_NOT_FOUND;
    return obj;
  }

  /**
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
    try {
      this._isExecuting = true;
      this._lastSuccess = undefined;
      const tags = this.tags;
      const calls = this.calls;
      this._response = Array(tags.length).fill([undefined, null]);

      checkSignals(runOptions.signals);

      let staticCalls;
      let staticIndexes;
      let mutableCalls;
      let mutableIndexes;

      if (runOptions.forceMutability) {
        if (runOptions.forceMutability === CallMutability.Static) {
          staticCalls = calls;
          staticIndexes = Array.from({ length: calls.length }, (_, i) => i);
          mutableCalls = [];
          mutableIndexes = [];
        } else {
          staticCalls = [];
          staticIndexes = [];
          mutableCalls = calls;
          mutableIndexes = Array.from({ length: calls.length }, (_, i) => i);
        }
      } else {
        const split = multicallSplitCalls(calls);
        staticCalls = split.staticCalls;
        staticIndexes = split.staticIndexes;
        mutableCalls = split.mutableCalls;
        mutableIndexes = split.mutableIndexes;
      }

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
        const iterationIndexes = mutableIndexes.slice(i, border); // half-opened interval

        const iterationResponse = await this._processMutableCalls(
          iterationCalls,
          runOptions
        );

        this._saveResponse(iterationResponse, iterationIndexes, tags);
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
      }
    } catch (error) {
      this._lastSuccess = false;
      throw error;
    } finally {
      this._isExecuting = false;
    }
    return this._lastSuccess;
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
   * @param {import('../../types/entities').MulticallOptions} runOptions
   * @returns {Promise<import('../../types/multicall').MulticallResponse[]>}
   */
  async _processMutableCalls(iterationCalls, runOptions) {
    let result;
    const tx = await this.call(aggregate3, [iterationCalls], {
      forceMutability: CallMutability.Mutable,
      highPriorityTx: runOptions.highPriorityTxs,
      priorityOptions: runOptions.priorityOptions,
      signals: runOptions.signals,
      timeoutMs: runOptions.mutableCallsTimeoutMs,
    });
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
      }
    } else {
      result = Array(iterationCalls.length).fill([true, tx]);
      this._lastSuccess = !(this._lastSuccess === false);
    }
    return result;
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
      this._rawData.set(tag, data);
      this._callsSuccess.set(tag, success);
      this._response[globalIndex] = el;
    });
  }
}

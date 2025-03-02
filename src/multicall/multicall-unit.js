import { Multicall3Abi } from '../abis/index.js';
import {
  DEFAULT_MULTICALL_CALLS_STACK_LIMIT,
  MULTICALL_ADDRESS,
} from '../constants.js';
import { Contract } from '../contract/index.js';
import { CallMutability } from '../entities/index.js';
import { isStaticArray } from '../helpers/index.js';
import { MULTICALL_ERRORS } from '../errors/index.js';

const aggregate3 = 'aggregate3';

export class MulticallUnit extends Contract {
  /**
   * @protected
   * @readonly
   * @type {import('../../types/entities').MulticallOptions}
   */
  _options = {};
  /**
   * @protected
   * @readonly
   * @type {Map<import('../../types/entities').MulticallTags, ContractCall>}
   */
  _units = new Map();
  /**
   * @protected
   * @readonly
   * @type {import('../../types/multicall').Response[]}
   */
  _response = [];
  /**
   * @protected
   * @readonly
   * @type {Map<import('../../types/entities').MulticallTags, string>}
   */
  _rawData = new Map();
  /**
   * @protected
   * @readonly
   * @type {Map<import('../../types/entities').MulticallTags, boolean>}
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
   * @param {import('ethers').Provider | import('ethers').Signer | undefined} driver
   * @param {import('../../types/entities').MulticallOptions} [options]
   * @param {string} [multicallAddress]
   */
  constructor(driver, options = {}, multicallAddress = MULTICALL_ADDRESS) {
    super(Multicall3Abi, multicallAddress, driver);
    this._options = {
      maxCallsStack: DEFAULT_MULTICALL_CALLS_STACK_LIMIT,
      waitForTxs: true, // The safest way to handle nonce in transactions
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
   * @param {import('../../types/entities').MulticallTags} tags
   * @param {import('../../types/entities').ContractCall} contractCall
   * @returns {import('../../types/entities').MulticallTags}
   */
  add(tags, contractCall) {
    this._units.set(tags, contractCall);
    return tags;
  }

  /**
   * @public
   * @returns {import('../../types/entities').MulticallTags[]}
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
   * @returns {import('../../types/multicall').Response[]}
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
    return this._callsSuccess.get(tags);
  }
  /**
   * @public
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {string | import('ethers').TransactionResponse | import('ethers').TransactionReceipt | undefined}
   */
  getRaw(tags) {
    return this._rawData.get(tags);
  }

  /**
   * @private
   * @param {import('../../types/entities').MulticallTags} tags
   * @returns {import('../../types/multicall').DecodableData | null}
   */
  _getDecodableData(tags) {
    const rawData = this._rawData.get(tags);
    const call = this._units.get(tags);
    if (
      !rawData ||
      typeof rawData !== 'string' || // rawData should be a string if it contains decodable data
      !call ||
      !this.isSuccess(tags)
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
    const data = this._getDecodableData(tags);
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
   * @param {boolean} [deep]
   * @returns {T | undefined}
   */
  getArray(tags, deep = false) {
    const data = this._getDecodableData(tags);
    if (!data) return undefined;
    const [array] = data.call.contractInterface
      .decodeFunctionResult(data.call.method, data.rawData)
      .toArray(deep);
    return array;
  }

  /**
   * @public
   * @param {import('../../types/entities').MulticallOptions} [options]
   * @returns {Promise<boolean>}
   */
  async run(options = {}) {
    const runOptions = {
      ...this._options,
      ...options,
    };

    if (this._isExecuting) throw MULTICALL_ERRORS.SIMULTANEOUS_INVOCATIONS;
    try {
      this._isExecuting = true;
      this._lastSuccess = undefined;
      this._response = [];
      const tags = this.tags;
      const calls = this.calls;

      for (let i = 0; i < calls.length; i += runOptions.maxCallsStack) {
        const endIndex = Math.min(i + runOptions.maxCallsStack, calls.length);
        const iterationCalls = calls.slice(i, endIndex); // half-opened interval

        const isStatic = runOptions.forceMutability
          ? runOptions.forceMutability === CallMutability.Static
          : isStaticArray(iterationCalls);

        const iterationResponse = await this._processCalls(
          iterationCalls,
          isStatic,
          runOptions
        );
        this._response.push(...iterationResponse);
      }

      this._response.forEach(([success, data], index) => {
        const tag = tags[index];
        if (!success) this._lastSuccess = false;
        this._rawData.set(tag, data);
        this._callsSuccess.set(tag, success);
      });
    } catch (error) {
      throw error;
    } finally {
      this._isExecuting = false;
    }
    return this._lastSuccess;
  }

  /**
   * @private
   * @param {import('../../types/entities').ContractCall[]} iterationCalls
   * @param {boolean} isStatic
   * @param {import('../../types/entities').MulticallOptions} runOptions
   * @returns {Promise<import('../../types/multicall').Response[]>}
   */
  async _processCalls(iterationCalls, isStatic, runOptions) {
    let result;
    if (isStatic) {
      result = await this.call(aggregate3, [iterationCalls], {
        forceMutability: CallMutability.Static,
      });
      this._lastSuccess = !(this._lastSuccess === false);
    } else {
      const tx = await this.call(aggregate3, [iterationCalls], {
        forceMutability: CallMutability.Mutable,
        highPriorityTx: runOptions.highPriorityTxs,
        priorityOptions: runOptions.priorityOptions,
      });
      if (runOptions.waitForTxs) {
        const receipt = await tx.wait();
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
    }
    return result;
  }
}

import { Multicall3Abi } from '../abis/index.js';
import { Contract } from '../contract/index.js';
import { MULTICALL_ADDRESS } from '../constants.js';
import { CONTRACTS_ERRORS } from '../errors/contracts.js';
import { isStaticMethod } from '../helpers/index.js';

export class MulticallUnit extends Contract {
  /**
   * @protected
   * @readonly
   * @type {Map<import('../../types').MulticallTags, ContractCall>}
   */
  _units = new Map();
  /**
   * @protected
   * @readonly
   * @type {import('../../types').Response[]}
   */
  _response = [];
  /**
   * @protected
   * @readonly
   * @type {Map<import('../../types').MulticallTags, string>}
   */
  _rawData = new Map();
  /**
   * @protected
   * @readonly
   * @type {Map<import('../../types').MulticallTags, boolean>}
   */
  _callsSuccess = new Map();
  /**
   * @protected
   * @type {boolean | undefined}
   */
  _lastSuccess;

  /**
   * @param {import('ethers').Provider | import('ethers').Signer | undefined} [driver]
   */
  constructor(driver) {
    super(Multicall3Abi, MULTICALL_ADDRESS, driver);
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
   * @param {import('../../types').MulticallTags} tags
   * @param {import('../../types').ContractCall} contractCall
   * @returns {import('../../types').MulticallTags}
   */
  add(tags, contractCall) {
    this._units.set(tags, contractCall);
    return tags;
  }

  /**
   * @public
   * @returns {import('../../types').MulticallTags[]}
   */
  get tags() {
    return Array.from(this._units.keys()); // The order is guaranteed
  }
  /**
   * @public
   * @returns {import('../../types').ContractCall[]}
   */
  get calls() {
    return Array.from(this._units.values()); // The order is guaranteed
  }
  /**
   * @public
   * @returns {import('../../types').Response[]}
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
    return !this.calls.some((call) => !isStaticMethod(call.stateMutability));
  }

  /**
   * @public
   * @param {import('../../types').MulticallTags} tags
   * @returns {boolean | undefined}
   */
  isSuccess(tags) {
    return this._callsSuccess.get(tags);
  }
  /**
   * @public
   * @param {import('../../types').MulticallTags} tags
   * @returns {string | undefined}
   */
  getRaw(tags) {
    return this._rawData.get(tags);
  }

  /**
   * @private
   * @param {import('../../types').MulticallTags} tags
   * @returns {import('../../types').PreparedData | null}
   */
  getPreparedData(tags) {
    const rawData = this._rawData.get(tags);
    const call = this._units.get(tags);
    if (!rawData || !call || !this.isSuccess(tags)) return null;
    return {
      call,
      rawData,
    };
  }

  /**
   * @template T
   * @public
   * @param {import('../../types').MulticallTags} tags
   * @returns {T | undefined}
   */
  getSingle(tags) {
    const data = this.getPreparedData(tags);
    if (!data) return undefined;
    return data.call.contractInterface.decodeFunctionResult(
      data.call.method,
      data.rawData
    )[0];
  }

  /**
   * @template T
   * @public
   * @param {import('../../types').MulticallTags} tags
   * @returns {T | undefined}
   */
  getArray(tags) {
    const data = this.getPreparedData(tags);
    if (!data) return undefined;
    return Object.values(
      data.call.contractInterface.decodeFunctionResult(
        data.call.method,
        data.rawData
      )[0]
    );
  }

  /**
   * @public
   * @returns {Promise<boolean>}
   */
  async run() {
    if (!this.contract.aggregate3) {
      throw CONTRACTS_ERRORS.METHOD_NOT_FOUND('aggregate3');
    }

    const tags = this.tags;
    const calls = this.calls;

    let response;
    if (this.static) {
      response = await this.contract.aggregate3.staticCall(calls);
    } else {
      if (this.isReadonly) throw CONTRACTS_ERRORS.TRY_TO_CALL_READ_ONLY;
      response = await this.contract.aggregate3(calls);
    }

    this._response = response;
    this._lastSuccess = true;
    response.forEach(([success, data], index) => {
      const tag = tags[index];
      if (!success) this._lastSuccess = false;
      this._rawData.set(tag, data);
      this._callsSuccess.set(tag, success);
    });
    return this._lastSuccess;
  }
}

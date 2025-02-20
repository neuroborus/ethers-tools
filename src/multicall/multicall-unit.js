import { Interface, JsonRpcProvider } from 'ethers';
import { Multicall3Abi } from '../abis/index.js';
import { Contract } from '../contract/index.js';
import { MULTICALL_ADDRESS } from '../constants.js';
import { CONTRACTS_ERRORS } from '../errors/contracts.js';
import { isStaticMethod } from '../helpers/index.js';

/**
 * @typedef {[string, import('./contract-call.js').ContractCall]} Unit
 * @typedef {[string, unknown]} Result
 * @typedef {[boolean, string]} Response
 * @typedef {{ tags: string[], calls: import('./contract-call.js').ContractCall[] }} SplitData
 */

/**
 * @param {Response[]} responses
 * @returns {boolean}
 */
const isSuccess = (responses) => responses.every((el) => el[0]);

export class MulticallUnit extends Contract {
  /** @type {Unit[]} */
  units = [];
  /** @type {Result[]} */
  results = [];
  /** @type {Map<string, string>} */
  rawData = new Map();
  /** @type {boolean | undefined} */
  lastSuccess;

  /**
   * @param {import('ethers').JsonRpcProvider | import('ethers').WebSocketProvider | import('ethers').Wallet} driver
   */
  constructor(driver) {
    super(Multicall3Abi, MULTICALL_ADDRESS, driver);
  }

  /**
   * @param {string} tag
   * @param {import('./contract-call.js').ContractCall} contractCall
   * @returns {string}
   */
  add(tag, contractCall) {
    this.units.push([tag, contractCall]);
    return tag;
  }

  get rawResults() {
    return this.results;
  }
  get success() {
    return this.lastSuccess;
  }
  get static() {
    return !this.units.some((unit) => !isStaticMethod(unit[1].stateMutability));
  }

  /**
   * @param {string} tag
   * @returns {string}
   */
  getRaw(tag) {
    return this.rawData.get(tag);
  }

  /**
   * @template T
   * @param {string} tag
   * @param {string} methodName
   * @param {Interface} contractInterface
   * @returns {T | undefined}
   */
  getSingle(tag, methodName, contractInterface) {
    const raw = this.rawData.get(tag);
    if (!raw) return undefined;
    return contractInterface.decodeFunctionResult(methodName, raw)[0];
  }

  /**
   * @template T
   * @param {string} tag
   * @param {string} methodName
   * @param {Interface} contractInterface
   * @returns {T | undefined}
   */
  getArray(tag, methodName, contractInterface) {
    const raw = this.rawData.get(tag);
    if (!raw) return undefined;
    return Object.values(
      contractInterface.decodeFunctionResult(methodName, raw)[0]
    );
  }

  /**
   * @returns {Promise<boolean>}
   */
  async run() {
    const split = this.units.reduce(
      (acc, [tag, call]) => {
        acc.tags.push(tag);
        acc.calls.push(call);
        return acc;
      },
      {
        tags: [],
        calls: [],
      }
    );

    if (!this.contract.aggregate3) {
      throw CONTRACTS_ERRORS.METHOD_NOT_FOUND('aggregate3');
    }

    let response;
    if (this.static) {
      response = await this.contract.aggregate3.staticCall(split.calls);
    } else {
      if (this.isReadonly) throw CONTRACTS_ERRORS.TRY_TO_CALL_READ_ONLY;
      response = await this.contract.aggregate3(split.calls);
    }

    this.results = split.tags.reduce((acc, tag, index) => {
      const data = response[index];
      if (!data) return acc;
      this.rawData.set(tag, data[1]);
      acc.push([tag, data]);
      return acc;
    }, []);

    this.lastSuccess = response.every((el) => el[0]);
    return this.lastSuccess;
  }
}

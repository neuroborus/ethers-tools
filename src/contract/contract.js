import { Contract as EthersContract, Signer } from 'ethers';
import { isStaticMethod } from '../helpers/index.js';
import { CONTRACTS_ERRORS } from '../errors/contracts.js';
import { MULTICALL_ALLOW_FAILURE } from '../constants.js';

/**
 * Base contract.
 */
export class Contract {
  /**
   * @readonly
   * @public
   * @type {string}
   */
  address;
  /**
   * @readonly
   * @protected
   * @type {import('ethers').Provider | import('ethers').Signer | undefined}
   */
  driver;
  /**
   * @readonly
   * @type {boolean}
   * @public
   */
  isCallable;
  /**
   * @readonly
   * @public
   * @type {boolean}
   */
  isReadonly;
  /**
   * @readonly
   * @public
   * @type {EthersContract}
   */
  contract;

  /**
   * @param {import('ethers').Interface | import('ethers').InterfaceAbi} abi
   * @param {string} [address]
   * @param {import('ethers').Provider | import('ethers').Signer | undefined} [driver]
   */
  constructor(
    abi,
    address = '0x0000000000000000000000000000000000000000',
    driver
  ) {
    this.address = address;
    this.driver = driver;
    this.isCallable = !!address && !!driver;
    this.isReadonly =
      !this.isCallable || !(driver && typeof driver.getAddress === 'function'); // if Signer
    this.contract = new EthersContract(address, abi, driver);
  }

  /**
   * @public
   * @returns {import('ethers').Interface}
   */
  get interface() {
    return this.contract.interface;
  }

  /**
   * @template T
   * @public
   * @param {string} methodName
   * @param {any[]} [args]
   * @returns {T}
   */
  async call(methodName, args = []) {
    if (!this.isCallable) throw CONTRACTS_ERRORS.TRY_TO_CALL_NON_CALLABLE;
    const method = this.contract[methodName];

    if (!method) throw CONTRACTS_ERRORS.METHOD_NOT_FOUND(methodName);

    const functionFragment = this.contract.interface.getFunction(methodName);
    if (!functionFragment)
      throw CONTRACTS_ERRORS.FRAGMENT_NOT_FOUND(methodName);

    if (isStaticMethod(functionFragment.stateMutability)) {
      return await method.staticCall(...args);
    } else {
      if (this.isReadonly) throw CONTRACTS_ERRORS.TRY_TO_CALL_NON_CALLABLE;
      return await method(...args);
    }
  }

  /**
   * @public
   * @param {string} methodName
   * @param {any[]} [args]
   * @param {Partial<import('../../types').ProviderContractCall>} [callData]
   * @returns {ContractCall}
   */
  getCall(methodName, args = [], callData = {}) {
    if (!this.address) throw CONTRACTS_ERRORS.ADDRESS_IS_NOT_PROVIDED;

    const functionFragment = this.interface.getFunction(methodName);
    if (!functionFragment)
      throw CONTRACTS_ERRORS.FRAGMENT_NOT_FOUND(methodName);

    return {
      method: methodName,
      target: this.address,
      allowFailure: MULTICALL_ALLOW_FAILURE,
      callData: this.interface.encodeFunctionData(methodName, args),
      stateMutability: functionFragment.stateMutability,
      contractInterface: this.interface,
      ...callData,
    };
  }
}

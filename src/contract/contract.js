import { Contract as EthersContract, Signer } from 'ethers';
import { Provider } from 'ethers';
import { DEFAULT_MULTICALL_ALLOW_FAILURE } from '../constants.js';
import { CallMutability } from '../entities/index.js';
import { CONTRACTS_ERRORS } from '../errors/contracts.js';
import { isStaticMethod, priorityCall } from '../helpers/index.js';

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
   * @public
   * @type {boolean}
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
   * @readonly
   * @protected
   * @type {import('ethers').Provider | import('ethers').Signer | undefined}
   */
  _driver;
  /**
   * @readonly
   * @protected
   * @type {import('../../types/entities').CallOptions}
   */
  _callsOptions;

  /**
   * @param {import('ethers').Interface | import('ethers').InterfaceAbi} abi
   * @param {string} [address]
   * @param {import('ethers').Provider | import('ethers').Signer | undefined} [driver]
   * @param {import('../../types/entities').CallOptions} [callsOptions]
   */
  constructor(
    abi,
    address = '0x0000000000000000000000000000000000000000',
    driver,
    callsOptions = {}
  ) {
    this.address = address;
    this._driver = driver;
    this.isCallable = !!address && !!driver;
    this.isReadonly =
      !this.isCallable || !(driver && typeof driver.getAddress === 'function'); // if Signer
    this.contract = new EthersContract(address, abi, driver);
    this._callsOptions = callsOptions;
  }

  get provider() {
    if (!this._driver) return undefined;
    if (typeof this._driver.getAddress === 'function')
      return this._driver.provider;
    return this._driver;
  }

  get signer() {
    if (this._driver && typeof this._driver.getAddress === 'function')
      return this._driver;
    return undefined;
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
   * @param {import('../../types/entities').CallOptions} [options]
   * @returns {T}
   */
  async call(methodName, args = [], options = {}) {
    if (!this.isCallable)
      throw CONTRACTS_ERRORS.NON_CALLABLE_CONTRACT_INVOCATION;
    const method = this.contract[methodName];

    if (!method) throw CONTRACTS_ERRORS.METHOD_NOT_DEFINED(methodName);

    const functionFragment = this.contract.interface.getFunction(methodName);
    if (!functionFragment)
      throw CONTRACTS_ERRORS.FRAGMENT_NOT_DEFINED(methodName);

    const callOptions = {
      ...this._callsOptions,
      ...options,
    };

    const isStatic = callOptions.forceMutability
      ? callOptions.forceMutability === CallMutability.Static
      : isStaticMethod(functionFragment.stateMutability);

    if (isStatic) {
      return method.staticCall(...args);
    } else {
      if (this.isReadonly) throw CONTRACTS_ERRORS.READ_ONLY_CONTRACT_MUTATION;
      let tx;
      if (callOptions.highPriorityTx) {
        const provider = this._driver.provider;
        tx = await priorityCall(
          provider,
          this._driver,
          this.contract,
          methodName,
          args,
          options.priorityOptions
        );
      } else {
        tx = await method(...args);
      }
      return tx;
    }
  }

  /**
   * @public
   * @param {string} methodName
   * @param {any[]} [args]
   * @param {Partial<import('../../types/entities').ContractCall>} [callData]
   * @returns {import('../../types/entities').ContractCall}
   */
  getCall(methodName, args = [], callData = {}) {
    if (!this.address) throw CONTRACTS_ERRORS.MISSING_CONTRACT_ADDRESS;

    const functionFragment = this.interface.getFunction(methodName);
    if (!functionFragment)
      throw CONTRACTS_ERRORS.FRAGMENT_NOT_DEFINED(methodName);

    return {
      method: methodName,
      target: this.address,
      allowFailure: DEFAULT_MULTICALL_ALLOW_FAILURE,
      callData: this.interface.encodeFunctionData(methodName, args),
      stateMutability: functionFragment.stateMutability,
      contractInterface: this.interface,
      ...callData,
    };
  }
}

import {
  Contract as EthersContract,
  Provider,
  Signer,
  WebSocketProvider,
} from 'ethers';
import { CallMutability } from '../entities/index.js';
import {
  DEFAULT_LOGS_BLOCKS_STEP,
  DEFAULT_LOGS_DELAY_MS,
  DEFAULT_MULTICALL_ALLOW_FAILURE,
} from '../constants.js';
import { isStaticMethod, priorityCall } from '../helpers/index.js';
import { CONTRACTS_ERRORS } from '../errors/index.js';

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
  callable;
  /**
   * @readonly
   * @public
   * @type {boolean}
   */
  readonly;
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
   * @type {import('../../types/entities').ContractOptions}
   */
  _options;

  /**
   * @param {import('ethers').Interface | import('ethers').InterfaceAbi} abi
   * @param {string} [address]
   * @param {import('ethers').Provider | import('ethers').Signer | undefined} [driver]
   * @param {import('../../types/entities').ContractOptions} [options]
   */
  constructor(
    abi,
    address = '0x0000000000000000000000000000000000000000',
    driver,
    options = {}
  ) {
    this.address = address;
    this._driver = driver;
    this.callable = !!address && !!driver;
    this.readonly =
      !this.callable || !(driver && typeof driver.getAddress === 'function'); // if Signer
    this.contract = new EthersContract(address, abi, driver);
    this._options = options;
  }

  /**
   * @public
   * @returns {import('ethers').Provider | undefined}
   */
  get provider() {
    if (!this._driver) return undefined;
    if (typeof this._driver.getAddress === 'function')
      return this._driver.provider;
    return this._driver;
  }

  /**
   * @public
   * @returns {import('ethers').Signer | undefined}
   */
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
   * @param {import('../../types/entities').ContractCallOptions} [options]
   * @returns {T}
   */
  async call(methodName, args = [], options = {}) {
    if (!this.callable) throw CONTRACTS_ERRORS.NON_CALLABLE_CONTRACT_INVOCATION;
    const method = this.contract[methodName];

    if (!method) throw CONTRACTS_ERRORS.METHOD_NOT_DEFINED(methodName);

    const functionFragment = this.contract.interface.getFunction(methodName);
    if (!functionFragment)
      throw CONTRACTS_ERRORS.FRAGMENT_NOT_DEFINED(methodName);

    const callOptions = {
      forceMutability: this._options.forceMutability,
      highPriorityTx: this._options.highPriorityTxs,
      priorityOptions: this._options.priorityOptions,
      ...options,
    };

    const isStatic = callOptions.forceMutability
      ? callOptions.forceMutability === CallMutability.Static
      : isStaticMethod(functionFragment.stateMutability);

    if (isStatic) {
      return method.staticCall(...args);
    } else {
      if (this.readonly) throw CONTRACTS_ERRORS.READ_ONLY_CONTRACT_MUTATION;
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

  /**
   * @public
   * @param {string} eventName
   * @param {import('ethers').Listener} listener
   * @returns {Promise<import('ethers').Contract>}
   */
  async listenEvent(eventName, listener) {
    if (!this.provider) throw CONTRACTS_ERRORS.MISSING_PROVIDER;
    if (!(this.provider instanceof WebSocketProvider))
      throw CONTRACTS_ERRORS.MISSING_WEBSOCKET_PROVIDER;

    return this.contract.on(eventName, listener);
  }

  /**
   * @public
   * @param {number} fromBlock
   * @param {number | 'latest'} [toBlock]
   * @param {string[]} [eventsNames]
   * @param {import('../../types/entities').ContractGetLogsOptions} [options]
   * @returns {Promise<import('ethers').Log[]>}
   */
  async getLogs(fromBlock, eventsNames = [], toBlock = 'latest', options = {}) {
    const logs = [];
    for await (const log of this.getLogsStream(
      fromBlock,
      eventsNames,
      toBlock,
      options
    )) {
      logs.push(log);
    }

    return logs;
  }

  /**
   * @public
   * @param {number} fromBlock
   * @param {number | 'latest'} [toBlock]
   * @param {string[]} [eventsNames]
   * @param {import('../../types/entities').ContractGetLogsOptions} [options]
   * @returns {AsyncGenerator<import('ethers').Log, void, unknown>}
   */
  async *getLogsStream(
    fromBlock,
    eventsNames = [],
    toBlock = 'latest',
    options = {}
  ) {
    if (!this.callable) throw CONTRACTS_ERRORS.NON_CALLABLE_CONTRACT_INVOCATION;

    const streamOptions = {
      blocksStep: this._options.logsBlocksStep || DEFAULT_LOGS_BLOCKS_STEP,
      delayMs: this._options.logsDelayMs || DEFAULT_LOGS_DELAY_MS,
      ...options,
    };

    const topics = eventsNames.map(
      (event) => this.contract.getEvent(event).fragment.topicHash
    );

    const finToBlock =
      toBlock === 'latest' ? await this.provider.getBlockNumber() : toBlock;
    const finFromBlock = fromBlock < 0 ? finToBlock + fromBlock : fromBlock;

    for (
      let from = finFromBlock;
      from < finToBlock;
      from += streamOptions.blocksStep
    ) {
      const to = Math.min(from + streamOptions.blocksStep, finToBlock);
      const localLogs = await this.provider.getLogs({
        fromBlock: from,
        toBlock: to,
        address: this.address,
        topics: topics.length ? [topics] : undefined,
      });

      for (const log of localLogs) {
        yield log;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, streamOptions.delayMs)
      );
    }
  }
}

import { Contract as EthersContract, WebSocketProvider } from 'ethers';
import { CallMutability } from '../entities/index.js';
import { config } from '../config.js';
import { isSigner, isStaticMethod, priorityCall } from '../helpers/index.js';
import { CONTRACTS_ERRORS } from '../errors/index.js';
import {
  checkSignals,
  createTimeoutSignal,
  raceWithSignals,
  waitWithSignals,
} from '../utils/index.js';

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
  _contractOptions;

  /**
   * @param {import('ethers').Interface | import('ethers').InterfaceAbi} abi
   * @param {string} [address='0x0000000000000000000000000000000000000000']
   * @param {import('ethers').Provider | import('ethers').Signer | undefined} [driver]
   * @param {import('../../types/entities').ContractOptions} [options={}]
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
    this.readonly = !this.callable || !(driver && isSigner(driver)); // if Signer
    this.contract = new EthersContract(address, abi, driver);
    this._contractOptions = {
      staticCallsTimeoutMs: config.contract.staticCalls.timeoutMs,
      mutableCallsTimeoutMs: config.contract.mutableCalls.timeoutMs,
      ...options,
    };
  }

  /**
   * @public
   * @returns {import('ethers').Provider | undefined}
   */
  get provider() {
    if (!this._driver) return undefined;
    if (isSigner(this._driver)) return this._driver.provider;
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
   * @param {any[]} [args=[]]
   * @param {import('../../types/entities').ContractCallOptions} [options={}]
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
      forceMutability: this._contractOptions.forceMutability,
      highPriorityTx: this._contractOptions.highPriorityTxs,
      priorityOptions: this._contractOptions.priorityOptions,
      ...options,
    };

    const isStatic = callOptions.forceMutability
      ? callOptions.forceMutability === CallMutability.Static
      : isStaticMethod(functionFragment.stateMutability);

    const localSignals = [];
    if (callOptions.signals) localSignals.push(...callOptions.signals);
    if (callOptions.timeoutMs)
      localSignals.push(
        this._getTimeoutSignal(isStatic, callOptions.timeoutMs)
      );

    if (isStatic) {
      return raceWithSignals(() => method.staticCall(...args), localSignals);
    } else {
      if (this.readonly) throw CONTRACTS_ERRORS.READ_ONLY_CONTRACT_MUTATION;
      let tx;
      if (callOptions.highPriorityTx) {
        const provider = this._driver.provider;
        tx = await raceWithSignals(
          () =>
            priorityCall(
              provider,
              this._driver,
              this.contract,
              methodName,
              args,
              {
                signals: localSignals,
                ...options.priorityOptions,
              }
            ),
          localSignals
        );
      } else {
        tx = await raceWithSignals(() => method(...args), localSignals);
      }
      return tx;
    }
  }

  /**
   * @public
   * @param {string} methodName
   * @param {any[]} [args=[]]
   * @param {Partial<import('../../types/entities').ContractCall>} [callData={}]
   * @returns {import('../../types/entities').ContractCall}
   */
  getCall(methodName, args = [], callData = {}) {
    if (!this.callable) throw CONTRACTS_ERRORS.NON_CALLABLE_CONTRACT_INVOCATION;

    const functionFragment = this.interface.getFunction(methodName);
    if (!functionFragment)
      throw CONTRACTS_ERRORS.FRAGMENT_NOT_DEFINED(methodName);

    return {
      method: methodName,
      target: this.address,
      allowFailure: config.multicallUnit.allowFailure,
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
    if (!this.callable) throw CONTRACTS_ERRORS.NON_CALLABLE_CONTRACT_INVOCATION;
    if (!(this.provider instanceof WebSocketProvider))
      throw CONTRACTS_ERRORS.MISSING_WEBSOCKET_PROVIDER;

    return this.contract.on(eventName, listener);
  }

  /**
   * @public
   * @param {number} fromBlock
   * @param {string[]} [eventsNames=[]]
   * @param {number} [toBlock=0]
   * @param {import('../../types/entities').ContractGetLogsOptions} [options={}]
   * @returns {Promise<import('ethers').LogDescription[]>}
   */
  async getLogs(fromBlock, eventsNames = [], toBlock = 0, options = {}) {
    const descriptions = [];
    for await (const description of this.getLogsStream(
      fromBlock,
      eventsNames,
      toBlock,
      options
    )) {
      descriptions.push(description);
    }

    return descriptions;
  }

  /**
   * @public
   * @param {number} fromBlock
   * @param {string[]} [eventsNames=[]]
   * @param {number} [toBlock=0]
   * @param {import('../../types/entities').ContractGetLogsOptions} [options={}]
   * @returns {AsyncGenerator<import('ethers').LogDescription, void>}
   */
  async *getLogsStream(
    fromBlock,
    eventsNames = [],
    toBlock = 0, // Latest by default
    options = {}
  ) {
    if (!this.callable) throw CONTRACTS_ERRORS.NON_CALLABLE_CONTRACT_INVOCATION;

    const streamOptions = {
      blocksStep:
        this._contractOptions.logsBlocksStep ||
        config.contract.logsGathering.blocksStep,
      delayMs:
        this._contractOptions.logsDelayMs ||
        config.contract.logsGathering.delayMs,
      ...options,
    };

    const topics = eventsNames.map(
      (event) => this.contract.getEvent(event).fragment.topicHash
    );

    checkSignals(options.signals);
    const finToBlock = toBlock ? toBlock : await this.provider.getBlockNumber();
    const finFromBlock = fromBlock < 0 ? finToBlock + fromBlock : fromBlock;

    for (
      let from = finFromBlock;
      from < finToBlock;
      from += streamOptions.blocksStep
    ) {
      checkSignals(options.signals);

      const to = Math.min(from + streamOptions.blocksStep, finToBlock);
      const localLogs = await this.provider.getLogs({
        fromBlock: from,
        toBlock: to,
        address: this.address,
        topics: topics.length ? [topics] : undefined,
      });

      for (const log of localLogs) {
        checkSignals(options.signals);
        const description = this.interface.parseLog(log);
        if (!description) continue;
        yield description;
      }

      await waitWithSignals(streamOptions.delayMs, options.signals);
    }
  }

  /**
   * @private
   * @param {boolean} isStatic
   * @param {number} [timeoutMs]
   * @returns {AbortSignal}
   */
  _getTimeoutSignal(isStatic, timeoutMs) {
    let timeout;
    if (timeoutMs) {
      timeout = timeoutMs;
    } else {
      if (isStatic) {
        timeout = this._contractOptions.staticCallsTimeoutMs;
      } else {
        timeout = this._contractOptions.mutableCallsTimeoutMs;
      }
    }
    return createTimeoutSignal(timeout);
  }
}

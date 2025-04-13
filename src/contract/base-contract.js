import { Contract, WebSocketProvider } from 'ethers';
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
import { contractCreateCallName } from './contract-create-call-name.js';

/**
 * Base wrapper around ethers.js Contract with built-in ContractCall (multicall) support,
 * signal-based timeouts/aborts, dynamic mutability detection, and event/log streaming.
 */
export class BaseContract {
  /**
   * Creates a subclass of this contract class where all ABI methods are automatically added
   * as instance methods (e.g., `contract.balanceOf(...)`) and corresponding call object getters
   * (e.g., `contract.getBalanceOfCall(...)`).
   *
   * This is useful for dynamic or generic contract wrappers that can call any ABI-defined method
   * or generate `ContractCall` objects for batching/multicall.
   *
   * @param {import('ethers').Interface | import('ethers').InterfaceAbi} abi - The contract ABI.
   * @param {string} [address] - Optional deployed contract address.
   * @param {import('ethers').Provider | import('ethers').Signer} [driver] - Optional provider or signer.
   * @param {import('../../types/entities').ContractOptions} [options] - Optional contract options.
   * @returns {import('../../types/contract').DynamicContractConstructor} A class constructor extending `BaseContract` with dynamic methods.
   */
  static createAutoClass(abi, address, driver, options) {
    const Base = this;
    // saw warning
    return class extends Base {
      constructor(args) {
        super(
          args?.abi || abi,
          args?.address || address,
          args?.driver || driver,
          args?.options || options
        );

        for (const [_ind, fragment] of Object.entries(
          this.interface.fragments
        )) {
          if (fragment.type === 'function') {
            const name = fragment.name; // exists
            if (!(name in this)) {
              Object.defineProperty(this, name, {
                value: async (args = [], options) =>
                  this.call(name, args, options),
                writable: true,
                enumerable: true,
              });
            }
            const getCallName = contractCreateCallName(name);

            if (!(getCallName in this)) {
              Object.defineProperty(this, getCallName, {
                value: (args = [], callData = {}) =>
                  this.getCall(name, args, callData),
                writable: true,
                enumerable: true,
              });
            }
          }
        }
      }
    };
  }
  /**
   * Creates an instance of an auto-wrapped contract with dynamic ABI methods
   * and `get<MethodName>Call()` getters added at runtime.
   *
   * Equivalent to: `new BaseContract.createAutoClass(...)()`
   *
   * @param {import('ethers').Interface | import('ethers').InterfaceAbi} abi - The contract ABI.
   * @param {string} [address] - Optional deployed contract address.
   * @param {import('ethers').Provider | import('ethers').Signer} [driver] - Optional provider or signer.
   * @param {import('../../types/entities').ContractOptions} [options] - Optional contract options.
   * @returns {import('../../types/contract').DynamicContract} A ready-to-use contract instance with dynamic method access.
   */
  static createAutoInstance(abi, address, driver, options) {
    const AutoClass = this.createAutoClass(abi, address, driver, options);
    return new AutoClass({ abi, address, driver, options });
  }

  /**
   * BaseContract address.
   * @readonly
   * @public
   * @type {string}
   */
  address;
  /**
   * Indicates whether the contract instance is callable (i.e., has both address and driver).
   * @readonly
   * @public
   * @type {boolean}
   */
  callable;
  /**
   * Indicates whether the contract instance is readonly (i.e., with no Signer).
   * @readonly
   * @public
   * @type {boolean}
   */
  readonly;
  /**
   * Internal ethers.js BaseContract instance.
   * @readonly
   * @public
   * @type {import('ethers').Contract}
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
    this.contract = new Contract(address, abi, driver);
    this._contractOptions = {
      staticCallsTimeoutMs: config.contract.staticCalls.timeoutMs,
      mutableCallsTimeoutMs: config.contract.mutableCalls.timeoutMs,
      ...options,
    };
  }

  /**
   * Current provider, if available.
   * @public
   * @returns {import('ethers').Provider | undefined}
   */
  get provider() {
    if (!this._driver) return undefined;
    return this._driver.provider;
  }

  /**
   * Current signer, if available.
   * @public
   * @returns {import('ethers').Signer | undefined}
   */
  get signer() {
    if (isSigner(this._driver)) return this._driver;
    return undefined;
  }

  /**
   * Contract interface (ABI parser).
   * @public
   * @returns {import('ethers').Interface}
   */
  get interface() {
    return this.contract.interface;
  }

  /**
   * Executes a contract method call or transaction depending on its mutability.
   * Automatically handles static calls vs. mutations and supports signal-based timeouts/aborts.
   * @template T
   * @public
   * @param {string} method
   * @param {any[]} [args=[]]
   * @param {import('../../types/entities').ContractCallOptions} [options={}]
   * @returns {T}
   */
  async call(method, args = [], options = {}) {
    if (!this.callable) throw CONTRACTS_ERRORS.NON_CALLABLE_CONTRACT_INVOCATION;
    const methodFn = this.contract[method];

    if (!methodFn) throw CONTRACTS_ERRORS.METHOD_NOT_DEFINED(method);

    const functionFragment = this.contract.interface.getFunction(method);
    if (!functionFragment) throw CONTRACTS_ERRORS.FRAGMENT_NOT_DEFINED(method);

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
      return raceWithSignals(() => methodFn.staticCall(...args), localSignals);
    } else {
      if (this.readonly) throw CONTRACTS_ERRORS.READ_ONLY_CONTRACT_MUTATION;
      let tx;
      if (callOptions.highPriorityTx) {
        const provider = this._driver.provider;
        tx = await raceWithSignals(
          () =>
            priorityCall(provider, this._driver, this.contract, method, args, {
              signals: localSignals,
              ...options.priorityOptions,
            }),
          localSignals
        );
      } else {
        tx = await raceWithSignals(() => methodFn(...args), localSignals);
      }
      return tx;
    }
  }

  /**
   * Creates a low-level call object for a given method, for use with multicall or batching.
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
   * Subscribes to an on-chain event using a WebSocket provider.
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
   * Fetches and decodes logs for given events between specified blocks.
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
   * Asynchronous generator that yields logs one-by-one in batches.
   * Allows for streaming consumption and signal-based cancellation.
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

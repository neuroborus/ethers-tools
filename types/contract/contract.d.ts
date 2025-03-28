import {
  Contract as EthersContract,
  Interface,
  InterfaceAbi,
  Listener,
  LogDescription,
  Provider,
  Signer,
} from 'ethers';
import {
  ContractCall,
  ContractCallOptions,
  ContractGetLogsOptions,
  ContractOptions,
} from '../entities';

/**
 * Base wrapper around ethers.js Contract with built-in ContractCall (multicall) support,
 * signal-based timeouts/aborts, dynamic mutability detection, and event/log streaming.
 */
export declare class Contract {
  /**
   * Contract address.
   */
  public readonly address: string;
  /**
   * Indicates whether the contract instance is callable (i.e., has both address and driver).
   */
  public readonly callable: boolean;
  /**
   * Indicates whether the contract instance is readonly (i.e., with no Signer).
   */
  public readonly readonly: boolean;
  /**
   * Internal ethers.js Contract instance.
   */
  public readonly contract: EthersContract;
  protected readonly _driver?: Provider | Signer;
  protected readonly _contractOptions: ContractOptions;

  constructor(
    abi: Interface | InterfaceAbi,
    address?: string,
    driver?: Signer | Provider,
    options?: ContractOptions
  );

  /**
   * Current provider, if available.
   */
  get provider(): Provider | undefined;
  /**
   * Current signer, if available.
   */
  get signer(): Signer | undefined;
  /**
   * Contract interface (ABI parser).
   */
  get interface(): Interface;

  /**
   * Executes a contract method call or transaction depending on its mutability.
   * Automatically handles static calls vs. mutations and supports signal-based timeouts/aborts.
   */
  call<T = unknown>(
    methodName: string,
    args?: any[],
    options?: ContractCallOptions
  ): Promise<T>;
  /**
   * Creates a low-level call object for a given method, for use with multicall or batching.
   */
  getCall(
    methodName: string,
    args?: any[],
    callData?: Partial<ContractCall>
  ): ContractCall;

  /**
   * Subscribes to an on-chain event using a WebSocket provider.
   */
  listenEvent(eventName: string, listener: Listener): Promise<Contract>;
  /**
   * Fetches and decodes logs for given events between specified blocks
   * (or N blocks ago - as first arg);
   */
  getLogs(
    fromBlock: number,
    eventsNames?: string[],
    toBlock?: number,
    options?: ContractGetLogsOptions
  ): Promise<LogDescription[]>;
  /**
   * Asynchronous generator that yields logs one-by-one in batches.
   * Allows for streaming consumption and signal-based cancellation.
   */
  getLogsStream(
    fromBlock: number,
    eventsNames?: string[],
    toBlock?: number,
    options?: ContractGetLogsOptions
  ): AsyncGenerator<LogDescription, void, unknown>;

  _getTimeoutSignal(
    isStatic: boolean,
    timeoutMs?: number
  ): Promise<AbortSignal>;
}

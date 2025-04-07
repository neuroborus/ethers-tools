import {
  AbstractProvider,
  Interface,
  Network,
  PerformActionRequest,
  Provider,
  Signer,
  TransactionRequest,
  TransactionResponse,
} from 'ethers';
import { MulticallOptions } from '../entities';
import { MulticallUnit } from './multicall-unit';

/**
 * MulticallProvider is a wrapper around an existing ethers.js Provider that batches
 * eth_call and sendTransaction requests using Multicall3 via MulticallUnit from ethers-tools.
 *
 * This provider is fully compatible with ethers.BaseContract and transparently reduces
 * the number of RPC calls by aggregating requests that occur within the same event loop tick.
 *
 * Features:
 * - Batches multiple read-only calls (eth_call) into a single Multicall
 * - Defers execution until the next tick using setTimeout(0)
 * - Integrates cleanly with ethers.js v6 contract system
 * - Delegates all other provider methods to the wrapped base provider
 *
 * @example
 * const baseProvider = new JsonRpcProvider(...);
 * const provider = new MulticallProvider(baseProvider);
 * const contract = new BaseContract(address, abi, provider);
 * const result = await contract.totalSupply(); // Executed via multicall batching
 */
export class MulticallProvider extends AbstractProvider {
  /**
   * The base driver used for multicall.
   */
  private _driver: Signer | Provider;
  /**
   * The base provider used for delegation.
   */
  private _baseProvider: AbstractProvider;
  /**
   * Internal multicall batching unit.
   */
  private _multicallUnit: MulticallUnit;
  /**
   * Multicall options.
   */
  private _multicallOptions?: MulticallOptions;
  /**
   * Optional Multicall3 contract address override.
   */
  private _multicallAddress?: string;
  /**
   * Indicates whether a batch execution is scheduled.
   */
  private _batchScheduled: boolean;

  /**
   * Internal handler for all standard provider actions (used by ethers.js v6).
   * This method intercepts specific methods (like 'call') and delegates the rest
   * to the underlying base provider's _perform method.
   */
  public _perform(req: PerformActionRequest): Promise<any>;
  /**
   * Internal required method
   */
  public _detectNetwork(): Promise<Network>;

  constructor(
    driver: Signer | Provider,
    options?: MulticallOptions,
    multicallAddress?: string
  );

  /**
   * Batches a read-only call (eth_call) to be executed via MulticallUnit.
   */
  public call(transaction: TransactionRequest): Promise<string>;
  /**
   * Batches a transaction request to be sent via MulticallUnit.
   */
  public sendTransaction(
    transaction: TransactionRequest
  ): Promise<TransactionResponse>;

  // Internal
  /**
   * Internal method to defer batch execution to next event loop tick.
   */
  private _scheduleRun(): void;
  /**
   * Executes all accumulated calls in the batch.
   */
  private _runBatch(): Promise<void>;
}

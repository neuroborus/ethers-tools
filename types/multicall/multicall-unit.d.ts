import {
  Provider,
  Signer,
  TransactionReceipt,
  TransactionResponse,
} from 'ethers';
import { EventEmitter } from 'node:events';
import {
  CallMutability,
  ContractCall,
  MulticallOptions,
  MulticallTags,
  MulticallWaitOptions,
  Tagable,
} from '../entities';
import { MulticallAssociatedCall } from '../entities';
import { BaseContract } from '../contract';
import { MulticallDecodableData } from './multicall-decodable-data';
import { MulticallResponse } from './multicall-response';

/**
 * MulticallUnit extends the BaseContract class to support batching multiple contract calls
 * into a single transaction or RPC call using the Multicall3 standard.
 * It supports static and mutable calls, result tagging, and decoding.
 */
export declare class MulticallUnit extends BaseContract {
  /**
   * Stores tagged contract calls.
   */
  protected _units: Map<Tagable, ContractCall>;
  /**
   * Stores raw responses from multicall (success flags and data).
   */
  protected _response: MulticallResponse[];
  /**
   * Stores raw data from each tagged result.
   */
  protected _rawData: Map<Tagable, string>;
  /**
   * Stores TransactionResponse for each mutable call.
   */
  protected readonly _txResponses: Map<Tagable, TransactionResponse>;
  /**
   * Stores TransactionReceipt for each mutable call.
   */
  protected readonly _txReceipts: Map<Tagable, TransactionReceipt>;
  /**
   * Stores success status for each call tag.
   */
  protected _callsSuccess: Map<Tagable, boolean>;
  /**
   * Inner events emitter.
   */
  protected readonly _emitter: EventEmitter;
  /**
   * Last overall success status of multicall execution.
   */
  protected _lastSuccess?: boolean;
  /**
   * Whether multicall execution is currently in progress.
   */
  protected _isExecuting: boolean;
  /**
   * Multicall configuration options.
   */
  protected readonly _multicallOptions: MulticallOptions;

  constructor(
    driver: Signer | Provider,
    options?: MulticallOptions,
    multicallAddress?: string
  );

  /**
   * Resets internal state: clears stored calls, responses, and results.
   */
  public clear(): void;

  /**
   * Adds a contract call to the batch with associated tags.
   */
  public add(contractCall: ContractCall, tags?: MulticallTags): MulticallTags;
  /**
   * Adds a batch of contract call with associated tags.
   */
  public addBatch(associatedCalls: MulticallAssociatedCall[]): MulticallTags[];

  /**
   * Returns the list of normalized tags in order of addition.
   */
  get tags(): Tagable[];
  /**
   * Returns the list of added contract calls in order of addition.
   */
  get calls(): ContractCall[];
  /**
   * Returns the raw response array for all calls.
   */
  get response(): MulticallResponse[];
  /**
   * Returns whether the last multicall run succeeded entirely.
   */
  get success(): boolean | undefined;
  /**
   * Determines whether all current calls are static.
   */
  get static(): boolean;
  /**
   * Indicates if a multicall run is in progress.
   */
  get executing(): boolean;

  /**
   * Returns success status for a specific tag.
   */
  public isSuccess(tags: MulticallTags): boolean | undefined;

  /**
   * Returns TransactionResponse for the mutable call.
   */
  public getTxResponse(tags: MulticallTags): TransactionResponse | null;
  /**
   * Returns TransactionReceipt for the mutable call.
   */
  public getTxReceipt(tags: MulticallTags): TransactionReceipt | null;
  /**
   * Returns TransactionResponse for the mutable call or throws.
   */
  public getTxResponseOrThrow(tags: MulticallTags): TransactionResponse;
  /**
   * Returns TransactionReceipt for the mutable call or throws.
   */
  public getTxReceiptOrThrow(tags: MulticallTags): TransactionReceipt;

  private _getDecodableData(tags: MulticallTags): MulticallDecodableData | null;

  /**
   * Decodes and returns a smart result for the given tag.
   * Automatically chooses the most appropriate return format based on ABI:
   * - If the method has exactly one output (e.g. returns address or address[]), that value is returned directly.
   * - If all outputs are named (e.g. returns (uint id, address user)), an object is returned.
   * - Otherwise, an array of values is returned.
   *
   * If the call is mutable, and returns a transaction or receipt instead of data, it is returned as-is.
   */
  public get<T>(tags: MulticallTags): T | null;
  /**
   * Like get(), but throws if the result is not found or cannot be decoded.
   */
  public getOrThrow<T>(tags: MulticallTags): T;
  /**
   * Returns an array of all decoded results.
   */
  public getAll<T>(deep?: boolean): T;
  /**
   * Like getAll(), but throws if any result is not found.
   */
  public getAllOrThrow<T>(deep?: boolean): T;
  /**
   * Returns a single decoded value (single output, first one).
   */
  public getSingle<T>(tags: MulticallTags): T | null;
  /**
   * Like getSingle(), but throws if result is not found.
   */
  public getSingleOrThrow<T>(tags: MulticallTags): T;
  /**
   * Returns decoded result - tuple as an array.
   */
  public getArray<T>(tags: MulticallTags, deep?: boolean): T | null;
  /**
   * Like getArray(), but throws if result is not found.
   */
  public getArrayOrThrow<T>(tags: MulticallTags, deep?: boolean): T;
  /**
   * Returns decoded result - tuple as an object.
   */
  public getObject<T>(tags: MulticallTags, deep?: boolean): T | null;
  /**
   * Like getObject(), but throws if result is not found.
   */
  public getObjectOrThrow<T>(tags: MulticallTags, deep?: boolean): T;
  /**
   * Returns raw result data for a specific tag.
   */
  public getRaw(tags: MulticallTags): string | null;
  /**
   * Returns raw result data for a specific tag or throws if not found.
   */
  public getRawOrThrow(tags: MulticallTags): string;

  /**
   * Waiting for the specific call execution.
   */
  public wait(
    tags: MulticallTags,
    options?: MulticallWaitOptions
  ): Promise<void>;
  /**
   * Waiting for the specific raw data.
   */
  public waitRaw(
    tags: MulticallTags,
    options?: MulticallWaitOptions
  ): Promise<string | null>;
  /**
   * Waiting for the specific raw data. Throws if not found.
   */
  public waitRawOrThrow(
    tags: MulticallTags,
    options?: MulticallWaitOptions
  ): Promise<string>;
  /**
   * Waiting for the specific TransactionResponse.
   */
  public waitTx(
    tags: MulticallTags,
    options?: MulticallWaitOptions
  ): Promise<TransactionResponse | null>;
  /**
   * Waiting for the specific TransactionResponse. Throws if not found.
   */
  public waitTxOrThrow(
    tags: MulticallTags,
    options?: MulticallWaitOptions
  ): Promise<TransactionResponse>;
  /**
   * Waiting for the specific TransactionReceipt.
   */
  public waitReceipt(
    tags: MulticallTags,
    options?: MulticallWaitOptions
  ): Promise<TransactionReceipt | null>;
  /**
   * Waiting for the specific TransactionReceipt. Throws if not found.
   */
  public waitReceiptOrThrow(
    tags: MulticallTags,
    options?: MulticallWaitOptions
  ): Promise<TransactionReceipt>;
  /**
   * Waiting for the parsed call result.
   */
  public waitFor<T>(
    tags: MulticallTags,
    options?: MulticallWaitOptions
  ): Promise<T>;
  /**
   * Like waitFor(), but throws if result is not found.
   */
  public waitForOrThrow<T>(
    tags: MulticallTags,
    options?: MulticallWaitOptions
  ): Promise<T>;

  /**
   * Executes all added calls in batches, depending on their mutability.
   * Fills internal response state, handles signal support and batch limits.
   */
  public run(options?: MulticallOptions): Promise<boolean>;
  /**
   * Estimates gas usage for all mutable calls in the multicall queue, processed in batches.
   * Static calls are ignored during estimation. Handles batch size limits and signal-based aborts.
   */
  public estimateRun(options?: MulticallOptions): Promise<bigint[]>;

  private _splitCalls(
    calls: ContractCall[],
    tags: Tagable[],
    forceMutability?: CallMutability
  ): Promise<MulticallResponse[]>;
  private _processStaticCalls(
    iterationCalls: ContractCall[],
    runOptions: MulticallOptions
  ): Promise<MulticallResponse[]>;
  private _processMutableCalls(
    iterationCalls: ContractCall[],
    iterationTags: Tagable[],
    runOptions: MulticallOptions
  ): Promise<MulticallResponse[]>;
  private _saveResponse(
    iterationResponse: MulticallResponse[],
    iterationIndexes: number[],
    globalTags: MulticallTags[]
  ): void;
}

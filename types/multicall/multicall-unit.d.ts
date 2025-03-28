import {
  Provider,
  Signer,
  TransactionReceipt,
  TransactionResponse,
} from 'ethers';
import {
  ContractCall,
  MulticallOptions,
  MulticallTags,
  Tagable,
} from '../entities';
import { Contract } from '../contract';
import { MulticallAssociatedCall } from './multicall-associated-call';
import { MulticallDecodableData } from './multicall-decodable-data';
import { MulticallResponse } from './multicall-response';

/**
 * MulticallUnit extends the Contract class to support batching multiple contract calls
 * into a single transaction or RPC call using the Multicall3 standard.
 * It supports static and mutable calls, result tagging, and decoding.
 */
export declare class MulticallUnit extends Contract {
  /**
   * Stores tagged contract calls.
   */
  protected readonly _units: Map<MulticallTags, ContractCall>;
  /**
   * Stores raw responses from multicall (success flags and data).
   */
  protected _response: MulticallResponse[];
  /**
   * Stores raw data from each tagged result.
   */
  protected readonly _rawData: Map<MulticallTags, string>;
  /**
   * Stores success status for each call tag.
   */
  protected readonly _callsSuccess: Map<MulticallTags, boolean>;
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
   * Returns raw result data for a specific tag.
   */
  public getRaw(
    tags: MulticallTags
  ): string | TransactionResponse | TransactionReceipt | undefined;

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
   * Executes all added calls in batches, depending on their mutability.
   * Fills internal response state, handles signal support and batch limits.
   */
  public run(options?: MulticallOptions): Promise<boolean>;
  private _processStaticCalls(
    iterationCalls: ContractCall[],
    runOptions: MulticallOptions
  ): Promise<MulticallResponse[]>;
  private _processMutableCalls(
    iterationCalls: ContractCall[],
    runOptions: MulticallOptions
  ): Promise<MulticallResponse[]>;
  private _saveResponse(
    iterationResponse: MulticallResponse[],
    iterationIndexes: number[],
    globalTags: MulticallTags[]
  ): void;
}

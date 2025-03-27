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
import { MulticallDecodableData } from './multicall-decodable-data';
import { MulticallResponse } from './multicall-response';

export declare class MulticallUnit extends Contract {
  protected readonly _units: Map<MulticallTags, ContractCall>;
  protected readonly _rawData: Map<MulticallTags, string>;
  protected readonly _callsSuccess: Map<MulticallTags, boolean>;
  protected _response: MulticallResponse[];
  protected _lastSuccess?: boolean;
  protected _isExecuting: boolean;
  protected readonly _multicallOptions: MulticallOptions;

  constructor(
    driver: Signer | Provider,
    options?: MulticallOptions,
    multicallAddress?: string
  );

  public clear(): void;

  public add(contractCall: ContractCall, tags?: MulticallTags): MulticallTags;

  get tags(): Tagable[];
  get calls(): ContractCall[];
  get response(): MulticallResponse[];
  get success(): boolean | undefined;
  get static(): boolean;
  get executing(): boolean;

  public isSuccess(tags: MulticallTags): boolean | undefined;
  public getRaw(
    tags: MulticallTags
  ): string | TransactionResponse | TransactionReceipt | undefined;

  private _getDecodableData(tags: MulticallTags): MulticallDecodableData | null;

  public get<T>(tags: MulticallTags): T | null;
  public getOrThrow<T>(tags: MulticallTags): T;
  public getAll<T>(deep?: boolean): T;
  public getAllOrThrow<T>(deep?: boolean): T;
  public getSingle<T>(tags: MulticallTags): T | null;
  public getSingleOrThrow<T>(tags: MulticallTags): T;
  public getArray<T>(tags: MulticallTags, deep?: boolean): T | null;
  public getArrayOrThrow<T>(tags: MulticallTags, deep?: boolean): T;
  public getObject<T>(tags: MulticallTags, deep?: boolean): T | null;
  public getObjectOrThrow<T>(tags: MulticallTags, deep?: boolean): T;

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

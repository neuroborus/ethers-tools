import {
  Provider,
  Signer,
  TransactionReceipt,
  TransactionResponse,
} from 'ethers';
import { Contract } from '../contract';
import { ContractCall, MulticallOptions, MulticallTags } from '../entities';

export type Response = [
  success: boolean | undefined,
  rawData: string | TransactionResponse | TransactionReceipt | null,
];
export interface DecodableData {
  call: ContractCall;
  rawData: string;
}

export declare class MulticallUnit extends Contract {
  protected readonly _options: MulticallOptions;
  protected readonly _units: Map<MulticallTags, ContractCall>;
  protected readonly _rawData: Map<MulticallTags, string>;
  protected readonly _callsSuccess: Map<MulticallTags, boolean>;
  protected _response: Response[];
  protected _lastSuccess?: boolean;
  protected _isExecuting: boolean;

  constructor(
    driver: Signer | Provider,
    options?: MulticallOptions,
    multicallAddress?: string
  );

  public clear(): void;

  public add(tags: MulticallTags, contractCall: ContractCall): MulticallTags;

  get tags(): MulticallTags[];
  get calls(): ContractCall[];
  get response(): Response[];
  get success(): boolean | undefined;
  get static(): boolean;
  get executing(): boolean;

  public isSuccess(tags: MulticallTags): boolean | undefined;
  public getRaw(
    tags: MulticallTags
  ): string | TransactionResponse | TransactionReceipt | undefined;

  private _getDecodableData(tags: MulticallTags): DecodableData | null;
  public getSingle<T>(tags: MulticallTags): T | undefined;
  public getArray<T>(tags: MulticallTags, deep?: boolean): T | undefined;

  public run(options?: MulticallOptions): Promise<boolean>;
  private _processStaticCalls(
    iterationCalls: ContractCall[]
  ): Promise<Response[]>;
  private _processMutableCalls(
    iterationCalls: ContractCall[],
    runOptions: MulticallOptions
  ): Promise<Response[]>;
  private _saveResponse(
    iterationResponse: Response[],
    iterationIndexes: number[],
    globalTags: MulticallTags[]
  ): Promise<Response[]>;
}

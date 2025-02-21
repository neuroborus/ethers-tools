import { JsonRpcProvider, Wallet, WebSocketProvider } from 'ethers';
import { Contract } from '../contract';
import { ContractCall, MulticallTags } from '../entities';

export type Response = [success: boolean, rawData: string];
export interface PreparedData {
  call: ContractCall;
  rawData: string;
}

export declare class MulticallUnit extends Contract {
  protected readonly _units: Map<MulticallTags, ContractCall>;
  protected readonly _rawData: Map<MulticallTags, string>;
  protected readonly _callsSuccess: Map<MulticallTags, boolean>;
  protected _response: Response[];
  protected _lastSuccess?: boolean;

  constructor(provider: JsonRpcProvider | WebSocketProvider | Wallet);

  public clear(): void;

  public add(tags: MulticallTags, contractCall: ContractCall): MulticallTags;

  get tags(): MulticallTags[];
  get calls(): ContractCall[];
  get response(): Response[];
  get success(): boolean | undefined;
  get static(): boolean;

  public isSuccess(tags: MulticallTags): boolean | undefined;
  public getRaw(tags: MulticallTags): string | undefined;

  private getPreparedData(tags: MulticallTags): PreparedData | null;
  public getSingle<T>(tags: MulticallTags): T | undefined;
  public getArray<T>(tags: MulticallTags): T | undefined;

  public run(): Promise<boolean>;
}

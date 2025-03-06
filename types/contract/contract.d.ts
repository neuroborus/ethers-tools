import {
  Contract as EthersContract,
  Interface,
  InterfaceAbi,
  Listener,
  Log,
  Provider,
  Signer,
} from 'ethers';
import {
  ContractCall,
  ContractCallOptions,
  ContractGetLogsOptions,
  ContractOptions,
} from '../entities';

export declare class Contract {
  public readonly contract: EthersContract;
  public readonly callable: boolean;
  public readonly readonly: boolean;
  public readonly address: string;
  protected readonly _driver?: Provider | Signer;
  protected readonly _options: ContractOptions;

  constructor(
    abi: Interface | InterfaceAbi,
    address?: string,
    driver?: Signer | Provider,
    options?: ContractOptions
  );

  get provider(): Provider | undefined;
  get signer(): Signer | undefined;
  get interface(): Interface;

  call<T = unknown>(
    methodName: string,
    args?: any[],
    options?: ContractCallOptions
  ): Promise<T>;
  getCall(
    methodName: string,
    args?: any[],
    callData?: Partial<ContractCall>
  ): ContractCall;

  listenEvent(eventName: string, listener: Listener): Promise<Contract>;
  getLogs(
    fromBlock: number,
    toBlock?: number,
    eventsNames?: string[],
    options?: ContractGetLogsOptions
  ): Promise<Log[]>;
  getLogsStream(
    fromBlock: number,
    toBlock?: number,
    eventsNames?: string[],
    options?: ContractGetLogsOptions
  ): AsyncGenerator<Log, void, unknown>;
}

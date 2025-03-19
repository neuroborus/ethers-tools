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

export declare class Contract {
  public readonly contract: EthersContract;
  public readonly callable: boolean;
  public readonly readonly: boolean;
  public readonly address: string;
  protected readonly _driver?: Provider | Signer;
  protected readonly _contractOptions: ContractOptions;

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
    eventsNames?: string[],
    toBlock?: number,
    options?: ContractGetLogsOptions
  ): Promise<LogDescription[]>;
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

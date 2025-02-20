import {
  Contract as EthersContract,
  Interface,
  InterfaceAbi,
  JsonRpcProvider,
  Wallet,
  WebSocketProvider,
} from 'ethers';
import { ContractCall } from '../entities';

export declare class Contract {
  public readonly contract: EthersContract;
  public readonly isCallable: boolean;
  public readonly isReadonly: boolean;
  public readonly address: string;
  protected readonly driver?: JsonRpcProvider | WebSocketProvider | Wallet;

  constructor(
    abi: Interface | InterfaceAbi,
    address?: string,
    provider?: JsonRpcProvider
  );

  get interface(): Interface;

  call<T = unknown>(methodName: string, args?: any[]): Promise<T>;
  getCall(methodName: string, args?: any[]): ContractCall;
}

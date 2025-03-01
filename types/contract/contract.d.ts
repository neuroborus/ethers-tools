import {
  Contract as EthersContract,
  Interface,
  InterfaceAbi,
  JsonRpcProvider,
  Provider,
  Signer,
} from 'ethers';
import { CallOptions, ContractCall } from '../entities';

export declare class Contract {
  public readonly contract: EthersContract;
  public readonly isCallable: boolean;
  public readonly isReadonly: boolean;
  public readonly address: string;
  protected readonly _driver?: Provider | Signer;
  protected readonly _callsOptions: CallOptions;

  constructor(
    abi: Interface | InterfaceAbi,
    address?: string,
    provider?: JsonRpcProvider
  );

  get provider(): Provider | undefined;
  get signer(): Signer | undefined;
  get interface(): Interface;

  call<T = unknown>(
    methodName: string,
    args?: any[],
    options?: CallOptions
  ): Promise<T>;
  getCall(
    methodName: string,
    args?: any[],
    callData?: Partial<ContractCall>
  ): ContractCall;
}

import { Interface, InterfaceAbi, Provider, Signer } from 'ethers';
import { ContractOptions } from '../entities';

export interface DynamicContractConstructorArgs {
  abi?: Interface | InterfaceAbi;
  address?: string;
  driver?: Provider | Signer;
  options?: ContractOptions;
}

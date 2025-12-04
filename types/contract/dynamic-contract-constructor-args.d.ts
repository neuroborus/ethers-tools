import { Interface, InterfaceAbi, Provider, Signer } from 'ethers';
import { Address, ContractOptions } from '../entities';

export interface DynamicContractConstructorArgs {
  abi?: Interface | InterfaceAbi;
  address?: string | Address;
  driver?: Provider | Signer;
  options?: ContractOptions;
}

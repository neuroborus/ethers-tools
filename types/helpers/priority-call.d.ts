import {
  Contract,
  FeeData,
  Provider,
  Signer,
  TransactionResponse,
} from 'ethers';
import { PriorityCallOptions } from '../entities';

export declare const priorityCall: (
  provider: Provider,
  signer: Signer,
  contract: Contract,
  method: string,
  args: any[],
  options: PriorityCallOptions
) => Promise<TransactionResponse>;

declare const gatherOriginalData: (
  provider: Provider,
  contract: Contract,
  method: string,
  args: any[],
  options: PriorityCallOptions
) => Promise<[FeeData, bigint]>;

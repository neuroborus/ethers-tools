import {
  Contract,
  FeeData,
  Provider,
  Signer,
  TransactionLike,
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

export declare const priorityCallEstimate: (
  provider: Provider,
  signer: Signer,
  contract: Contract,
  method: string,
  args: any[],
  options: PriorityCallOptions
) => Promise<bigint>;

declare const formTx: (
  provider: Provider,
  signer: Signer,
  contract: Contract,
  method: string,
  args: any[],
  options: PriorityCallOptions
) => Promise<TransactionLike>;

declare const gatherOriginalData: (
  provider: Provider,
  contract: Contract,
  method: string,
  args: any[],
  options: PriorityCallOptions
) => Promise<[FeeData, bigint]>;

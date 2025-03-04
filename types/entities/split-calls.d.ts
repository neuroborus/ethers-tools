import { ContractCall } from './contract-call';

export interface SplitCalls {
  staticCalls: ContractCall[];
  staticIndexes: number[];
  mutableCalls: ContractCall[];
  mutableIndexes: number[];
}

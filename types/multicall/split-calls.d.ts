import { ContractCall } from '../entities';

export interface SplitCalls {
  staticCalls: ContractCall[];
  staticIndexes: number[];
  mutableCalls: ContractCall[];
  mutableIndexes: number[];
}

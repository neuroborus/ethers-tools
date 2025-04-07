import { ContractCall, Tagable } from '../entities';

export interface SplitCalls {
  staticCalls: ContractCall[];
  staticIndexes: number[];
  mutableCalls: ContractCall[];
  mutableTags: Tagable[];
  mutableIndexes: number[];
}

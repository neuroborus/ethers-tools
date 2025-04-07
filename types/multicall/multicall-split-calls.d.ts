import { ContractCall, Tagable } from '../entities';
import { SplitCalls } from './split-calls';

export declare const multicallSplitCalls: (
  calls: ContractCall[],
  tags: Tagable[]
) => SplitCalls;

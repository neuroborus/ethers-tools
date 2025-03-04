import { CallMutability } from './call-mutability';
import { PriorityCallOptions } from './priority-call-options';

// Used at the moment of creation and during execution
export interface MulticallOptions {
  maxStaticCallsStack?: number;
  maxMutableCallsStack?: number;
  forceMutability?: CallMutability;
  waitForTxs?: boolean;
  highPriorityTxs?: boolean;
  priorityOptions?: PriorityCallOptions;
}

import { CallMutability } from './call-mutability';
import { PriorityCallOptions } from './priority-call-options';

// Used at the moment of creation and during execution
export interface MulticallOptions {
  forceMutability?: CallMutability;
  waitForTxs?: boolean;
  highPriorityTxs?: boolean;
  priorityOptions?: PriorityCallOptions;
  maxStaticCallsStack?: number;
  maxMutableCallsStack?: number;
  signals?: AbortSignal[];
  staticCallsTimeoutMs?: number;
  mutableCallsTimeoutMs?: number;
  waitCallsTimeoutMs?: number;
}

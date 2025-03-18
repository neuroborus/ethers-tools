import { CallMutability } from './call-mutability';
import { PriorityCallOptions } from './priority-call-options';

export interface ContractCallOptions {
  forceMutability?: CallMutability;
  highPriorityTx?: boolean;
  priorityOptions?: PriorityCallOptions;
  signals?: AbortSignal[];
  timeoutMs?: number;
}

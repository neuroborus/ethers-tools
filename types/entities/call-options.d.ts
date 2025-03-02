import { CallMutability } from './call-mutability';
import { PriorityCallOptions } from './priority-call-options';

export interface CallOptions {
  forceMutability?: CallMutability;
  highPriorityTx?: boolean;
  priorityOptions?: PriorityCallOptions;
}

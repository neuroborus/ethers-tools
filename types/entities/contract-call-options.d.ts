import { CallMutability } from './call-mutability';
import { PriorityCallOptions } from './priority-call-options';

export interface ContractCallOptions {
  // encodedMethod?: boolean; // if false - "method" provided as methodName, if true - as encoded data
  forceMutability?: CallMutability;
  highPriorityTx?: boolean;
  priorityOptions?: PriorityCallOptions;
  signals?: AbortSignal[];
  timeoutMs?: number;
}

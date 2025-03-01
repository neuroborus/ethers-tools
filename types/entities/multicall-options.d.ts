import { MulticallMutability } from './multicall-mutability';

// Used at the moment of creation or during execution
export interface MulticallOptions {
  forceMutability?: MulticallMutability;
  waitForTx?: boolean;
  highPriorityTxs?: boolean;
  maxCallsStack?: number;
}

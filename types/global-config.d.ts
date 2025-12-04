import { Address } from './entities';

export interface GlobalConfig {
  multicallUnit: {
    address: string | Address;
    allowFailure: boolean;
    waitForTxs: boolean;
    staticCalls: {
      batchLimit: number;
      timeoutMs: number;
    };
    mutableCalls: {
      batchLimit: number;
      timeoutMs: number;
    };
    waitCalls: {
      timeoutMs: number;
    };
    priorityCalls: {
      multiplier: number;
    };
    batchDelayMs: number;
    maxAsyncReadBatches: number;
  };
  contract: {
    staticCalls: {
      timeoutMs: number;
    };
    mutableCalls: {
      timeoutMs: number;
    };
    logsGathering: {
      blocksStep: number;
      delayMs: number;
    };
  };
  priorityCalls: {
    multiplier: number;
  };
}

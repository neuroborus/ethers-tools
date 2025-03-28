export type GlobalConfig = {
  multicallUnit: {
    address: string;
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
};

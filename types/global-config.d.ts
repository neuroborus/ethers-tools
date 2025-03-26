export type GlobalConfig = {
  multicallUnit: {
    address: string;
    allowFailure: boolean;
    waitForTxs: boolean;
    staticCalls: {
      stackLimit: number;
      timeoutMs: number;
    };
    mutableCalls: {
      stackLimit: number;
      timeoutMs: number;
    };
    waitCalls: {
      timeoutMs: number;
    };
    priorityCalls: {
      multiplier: number;
    };
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

import {
  DEFAULT_LOGS_BLOCKS_STEP,
  DEFAULT_LOGS_DELAY_MS,
  DEFAULT_MULTICALL_ALLOW_FAILURE,
  DEFAULT_MULTICALL_MUTABLE_CALLS_BATCH_LIMIT,
  DEFAULT_MULTICALL_STATIC_CALLS_BATCH_LIMIT,
  DEFAULT_MULTICALL_WAIT_FOR_TXS,
  DEFAULT_MUTABLE_CALLS_TIMEOUT_MS,
  DEFAULT_PRIORITY_CALL_MULTIPLIER,
  DEFAULT_STATIC_CALLS_TIMEOUT_MS,
  DEFAULT_WAIT_CALLS_TIMEOUT_MS,
  MULTICALL_ADDRESS,
} from './constants.js';

/**
 * @type {import('../types/global-config.d.ts').GlobalConfig}
 */
export const config = {
  multicallUnit: {
    address: MULTICALL_ADDRESS,
    allowFailure: DEFAULT_MULTICALL_ALLOW_FAILURE,
    waitForTxs: DEFAULT_MULTICALL_WAIT_FOR_TXS,
    staticCalls: {
      batchLimit: DEFAULT_MULTICALL_STATIC_CALLS_BATCH_LIMIT,
      timeoutMs: DEFAULT_STATIC_CALLS_TIMEOUT_MS,
    },
    mutableCalls: {
      batchLimit: DEFAULT_MULTICALL_MUTABLE_CALLS_BATCH_LIMIT,
      timeoutMs: DEFAULT_MUTABLE_CALLS_TIMEOUT_MS,
    },
    waitCalls: {
      timeoutMs: DEFAULT_WAIT_CALLS_TIMEOUT_MS,
    },
    priorityCalls: {
      multiplier: DEFAULT_PRIORITY_CALL_MULTIPLIER,
    },
  },
  contract: {
    staticCalls: {
      timeoutMs: DEFAULT_STATIC_CALLS_TIMEOUT_MS,
    },
    mutableCalls: {
      timeoutMs: DEFAULT_MUTABLE_CALLS_TIMEOUT_MS,
    },
    logsGathering: {
      blocksStep: DEFAULT_LOGS_BLOCKS_STEP,
      delayMs: DEFAULT_LOGS_DELAY_MS,
    },
  },
  priorityCalls: {
    multiplier: DEFAULT_PRIORITY_CALL_MULTIPLIER,
  },
};

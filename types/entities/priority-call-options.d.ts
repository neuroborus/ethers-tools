import { Overrides } from 'ethers';

export interface PriorityCallOptions {
  parallelFeeRequests?: boolean; // Can be a little faster if provider allows
  chainId?: bigint; // Prevents replay attacks by ensuring the transaction is valid only for the intended blockchain network. Manually set
  autoDetectChainId?: boolean; // Prevents replay attacks by ensuring the transaction is valid only for the intended blockchain network. Automatic - async request
  multiplier?: number; // Multiplier of gasPrise and gasLimits
  signals?: AbortSignal[];
  timeoutMs?: number;
  overrides?: Overrides;
}

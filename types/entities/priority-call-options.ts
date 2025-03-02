export interface PriorityCallOptions {
  asynchronous?: boolean; // Can be a little faster if provider allows
  chainId?: bigint; // Prevents replay attacks by ensuring the transaction is valid only for the intended blockchain network. Manually set
  provideChainId?: boolean; // Prevents replay attacks by ensuring the transaction is valid only for the intended blockchain network. Automatic - async request
  multiplier?: number; // Multiplier of gasPrise and gasLimits
}

import { Provider } from 'ethers';

export declare const waitForAddressPendingTxs: (
  address: string,
  provider: Provider,
  delayMs?: number,
  signals?: AbortSignal[]
) => Promise<void>;

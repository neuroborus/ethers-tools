import { Provider } from 'ethers';
import { Address } from '../entities';

export declare const waitForAddressPendingTxs: (
  address: string | Address,
  provider: Provider,
  delayMs?: number,
  signals?: AbortSignal[]
) => Promise<void>;

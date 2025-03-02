import { Provider } from 'ethers';

export declare const waitForAddressTxs: (
  address: string,
  provider: Provider,
  delayMs?: number
) => Promise<void>;

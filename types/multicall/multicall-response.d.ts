import { TransactionReceipt, TransactionResponse } from 'ethers';

export type MulticallResponse = [
  success: boolean | undefined,
  rawData: string | TransactionResponse | TransactionReceipt | null,
];

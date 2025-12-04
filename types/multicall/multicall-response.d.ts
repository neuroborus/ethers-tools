import { TransactionReceipt, TransactionResponse } from 'ethers';
import { Hex } from '../entities';

export type MulticallResponse = [
  success: boolean | undefined,
  rawData: Hex | TransactionResponse | TransactionReceipt | null,
];

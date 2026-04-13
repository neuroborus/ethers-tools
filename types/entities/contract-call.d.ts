import { Interface } from 'ethers';
import { Hex } from './hex';
import type { StateMutability } from './state-mutability';

export interface ContractCall {
  method?: string; // Optional params are using for the result parsing
  contractInterface?: Interface;
  target: string;
  allowFailure: boolean;
  callData: Hex;
  stateMutability: StateMutability;
  value?: bigint;
}

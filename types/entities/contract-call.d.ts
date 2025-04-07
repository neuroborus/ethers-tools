import { Interface } from 'ethers';
import type { StateMutability } from './state-mutability';

export interface ContractCall {
  method?: string; // Optional params are using for the result parsing
  contractInterface?: Interface;
  target: string;
  allowFailure: boolean;
  callData: string;
  stateMutability: StateMutability;
}

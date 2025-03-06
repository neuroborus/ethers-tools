import { Interface } from 'ethers';
import type { StateMutability } from './state-mutability';

export interface ContractCall {
  method: string;
  target: string;
  allowFailure: boolean;
  callData: string;
  stateMutability: StateMutability;
  contractInterface: Interface;
}

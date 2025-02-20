import type { StateMutability } from './state-mutability';

export type ContractCall = {
  method: string;
  target: string;
  allowFailure: boolean;
  callData: string;
  stateMutability: StateMutability;
};

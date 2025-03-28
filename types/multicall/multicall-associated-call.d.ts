import { ContractCall, Tagable } from '../entities';

export interface MulticallAssociatedCall {
  call: ContractCall;
  tags?: Tagable;
}

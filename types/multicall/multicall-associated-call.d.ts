import { ContractCall, MulticallTags } from '../entities';

export interface MulticallAssociatedCall {
  call: ContractCall;
  tags?: MulticallTags;
}

import { ContractCall, MulticallTags } from './index';

export interface MulticallAssociatedCall {
  call: ContractCall;
  tags?: MulticallTags;
}

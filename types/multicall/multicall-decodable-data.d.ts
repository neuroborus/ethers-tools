import { ContractCall, Hex } from '../entities';

export interface MulticallDecodableData {
  call: ContractCall;
  rawData: Hex;
}

import { ContractCall } from '../entities';

export interface MulticallDecodableData {
  call: ContractCall;
  rawData: string;
}

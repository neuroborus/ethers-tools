import { Log, LogDescription } from 'ethers';

export interface ContractLog {
  log: Log;
  description: LogDescription;
}

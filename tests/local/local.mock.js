import { Contract, ethers } from 'ethers';
import { BaseContract, MulticallProvider } from '../../src/index.js';
import StorageAbi from './simple-storage.abi.json';

export const MULTICALL_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
export const SIMPLE_STORAGE_ADDRESS =
  '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853';

export const RPC_URL = 'ws://127.0.0.1:8545';
export const PROVIDER = new ethers.WebSocketProvider(RPC_URL);
export const MULTICALL_PROVIDER = new MulticallProvider(
  PROVIDER,
  undefined,
  MULTICALL_ADDRESS
);
export const WALLET = new ethers.Wallet(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  PROVIDER
);
export const ETHERS_MULTICALL_DRIVER = new ethers.Wallet(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  MULTICALL_PROVIDER
);
export const ETHERS_MULTICALL_CONTRACT = new Contract(
  SIMPLE_STORAGE_ADDRESS,
  StorageAbi,
  ETHERS_MULTICALL_DRIVER
);

export class SimpleStorage extends BaseContract {
  constructor(driver) {
    super(StorageAbi, SIMPLE_STORAGE_ADDRESS, driver);
  }

  setFirst(newValue, options) {
    return this.call('setFirst', [newValue], options);
  }
  setFirstCall(newValue) {
    return this.getCall('setFirst', [newValue]);
  }

  setSecond(newValue) {
    return this.call('setSecond', [newValue]);
  }
  setSecondCall(newValue) {
    return this.getCall('setSecond', [newValue]);
  }

  getFirst() {
    return this.call('getFirst');
  }
  getFirstCall() {
    return this.getCall('getFirst');
  }

  getSecond() {
    return this.call('getSecond');
  }
  getSecondCall() {
    return this.getCall('getSecond');
  }

  getWriteCount() {
    return this.call('getWriteCount');
  }
  getWriteCountCall() {
    return this.getCall('getWriteCount');
  }

  getBoth() {
    return this.call('getBoth');
  }
  getBothCall() {
    return this.getCall('getBoth');
  }
}

export class AsyncAbortController extends AbortController {
  async abortAsync(delay = 10) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    this.abort();
  }
}

export const SimpleStorageAutoInstance = BaseContract.createAutoInstance(
  StorageAbi,
  SIMPLE_STORAGE_ADDRESS,
  WALLET
);
export const SimpleStorageAutoClass = BaseContract.createAutoClass(
  StorageAbi,
  SIMPLE_STORAGE_ADDRESS,
  WALLET
);

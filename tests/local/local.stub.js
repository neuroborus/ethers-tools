import { ethers } from 'ethers';
import { Contract } from '../../src/index.js';
import StorageAbi from './simple-storage.abi.json';

export const MULTICALL_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
export const SIMPLE_STORAGE_ADDRESS =
  '0x5FbDB2315678afecb367f032d93F642f64180aa3';

export const RPC_URL = 'ws://127.0.0.1:8545';
export const PROVIDER = new ethers.WebSocketProvider(RPC_URL);
export const WALLET = new ethers.Wallet(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  PROVIDER
);

export class SimpleStorage extends Contract {
  constructor(driver) {
    super(StorageAbi, SIMPLE_STORAGE_ADDRESS, driver);
  }

  setFirst(newValue) {
    return this.call('setFirst', [newValue]);
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
}

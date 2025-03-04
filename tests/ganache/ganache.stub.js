import { ethers } from 'ethers';
import { Contract } from '../../src/index.js';
import StorageAbi from './simple-storage.abi.json';

export const MULTICALL_ADDRESS = '0x3755796B1C0C92232EbA3Bbe8718d0df4B47294c';
export const SIMPLE_STORAGE_ADDRESS =
  '0xE31cA8784322e7eC129DC37e0b91b4Cdad3ED4E4';

export const RPC_URL = 'http://127.0.0.1:7545';
export const PROVIDER = new ethers.JsonRpcProvider(RPC_URL);
export const WALLET = new ethers.Wallet(
  '0xe47ef3b54ae99af0d760f64e456a6b397324146ddece94f04a281216bfbb8aeb',
  PROVIDER
);

export class SimpleStorage extends Contract {
  constructor(driver) {
    super(StorageAbi, SIMPLE_STORAGE_ADDRESS, driver);
  }

  set(newValue) {
    return this.call('set', [newValue]);
  }
  setCall(newValue) {
    return this.getCall('set', [newValue]);
  }

  get() {
    return this.call('get');
  }
  getGetCall() {
    return this.getCall('get');
  }

  getWriteCount() {
    return this.call('getWriteCount');
  }
  getWriteCountCall() {
    return this.getCall('getWriteCount');
  }
}

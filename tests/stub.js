import { ethers } from 'ethers';
import { Contract } from '../src';
import RegistryAbi from './aave-v3-providers-registry.abi.json';

export const JSON_RPC_URL = 'https://eth.drpc.org';
export const WSS_RPC_URL = 'wss://ethereum-rpc.publicnode.com';
export const JSON_PROVIDER = new ethers.JsonRpcProvider(JSON_RPC_URL);
export const WSS_PROVIDER = new ethers.WebSocketProvider(WSS_RPC_URL);
export const JSON_WALLET = new ethers.Wallet(
  '0x8948503b23d1fdda8e11c2dac20c2c9cbd8596cd2a253d7f7fdd8e25fa2862ae',
  JSON_PROVIDER
);
export const WSS_WALLET = new ethers.Wallet(
  '0x8948503b23d1fdda8e11c2dac20c2c9cbd8596cd2a253d7f7fdd8e25fa2862ae',
  WSS_PROVIDER
);

export class RegistryContract extends Contract {
  constructor(driver) {
    super(RegistryAbi, '0xbaA999AC55EAce41CcAE355c77809e68Bb345170', driver);
  }

  getAddressesProvidersListCall() {
    return this.getCall('getAddressesProvidersList');
  }

  owner() {
    return this.call('owner');
  }

  getOwnerCall() {
    // 0x5300A1a15135EA4dc7aD5a167152C01EFc9b192A
    return this.getCall('owner');
  }

  renounceOwnership() {
    return this.call('renounceOwnership');
  }

  getRenounceOwnershipCall() {
    // Non-static call
    return this.getCall('renounceOwnership');
  }
}

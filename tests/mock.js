import { ethers } from 'ethers';
import { BaseContract } from '../src';
import RegistryAbi from './aave-v3-providers-registry.abi.json';
import CometAbi from './compound-v3-comet.abi.json';

export const JSON_RPC_URL = 'https://eth.llamarpc.com';
export const WSS_RPC_URL = 'wss://mainnet.gateway.tenderly.co';
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

const REGISTRY_ADDRESS = '0xbaA999AC55EAce41CcAE355c77809e68Bb345170';

export class RegistryContract extends BaseContract {
  constructor(driver) {
    super(RegistryAbi, REGISTRY_ADDRESS, driver);
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

export class CometContract extends BaseContract {
  constructor(driver) {
    super(CometAbi, '0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840', driver);
  }

  getUserBasicCall() {
    return this.getCall('userBasic', [
      '0x3a32672E92b84B1dBFFd547Dc9fDDE14d17a6796',
    ]);
  }

  userBasic() {
    return this.call('userBasic', [
      '0x3a32672E92b84B1dBFFd547Dc9fDDE14d17a6796',
    ]);
  }
}

export const RegistryAutoClass = BaseContract.createAutoClass(
  RegistryAbi,
  REGISTRY_ADDRESS,
  JSON_PROVIDER
);
export const RegistryAutoInstance = BaseContract.createAutoInstance(
  RegistryAbi,
  REGISTRY_ADDRESS,
  JSON_PROVIDER
);

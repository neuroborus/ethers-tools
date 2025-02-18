import { describe, test, expect } from 'vitest';
import { ethers } from 'ethers';
import { MulticallUnit, Contract } from '../../src';
import RegistryAbi from './aave-v3-providers-registry.abi.json';


const RPC_URL = "https://eth.llamarpc.com";
const PROVIDER = new ethers.JsonRpcProvider(RPC_URL);
const unit = new MulticallUnit(PROVIDER);

class RegistryContract extends Contract {
    constructor() {
        super(RegistryAbi, '0xbaA999AC55EAce41CcAE355c77809e68Bb345170', PROVIDER);
    }

    getAddressesProvidersListCall() {
        return {
            method: 'getAddressesProvidersList',
            target: this.address,
            allowFailure: true,
            callData: this.interface.encodeFunctionData('getAddressesProvidersList'),
        };
    }

    owner() {
        return this.contract.owner();
    }

    getOwnerCall() {
        // 0x5300A1a15135EA4dc7aD5a167152C01EFc9b192A
        return {
            method: 'owner',
            target: this.address,
            allowFailure: true,
            callData: this.interface.encodeFunctionData('owner'),
        };
    }
}
const registry = new RegistryContract();

describe('Test MulticallUnit', () => {
test('Test of MulticallUnit', async () => {
    const listCall = registry.getAddressesProvidersListCall();
    const listCallTag = 'listCall';
    unit.add(listCallTag, listCall);

    const ownerCall = registry.getOwnerCall();
    const ownerCallTag = 'ownerCall';
    unit.add(ownerCallTag, ownerCall);

    const result = await unit.run();

    const list = unit.getArray(listCallTag, listCall.method, registry.interface);
    const owner = unit.getSingle(ownerCallTag, ownerCall.method, registry.interface);

    expect(list[0]).to.be.equal('0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e');
    expect(owner).to.be.eq('0x5300A1a15135EA4dc7aD5a167152C01EFc9b192A');
    expect(result).to.be.true;
});
});


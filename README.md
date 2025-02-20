# ethers-tools

[![npm version](https://badge.fury.io/js/ethers-tools.svg)](https://badge.fury.io/js/ethers-tools)

### Installation

`npm i ethers-tools`

### Description

**ethers-tools** is a lightweight JavaScript/TypeScript library built on top of [ethers.js](https://github.com/ethers-io/ethers.js)  
designed to simplify **smart contract** interactions and [multicall3](https://www.multicall3.com/) aggregation  
on the Ethereum blockchain and compatible EVM networks.

### Usage example

```typescript
import { MulticallUnit, Contract, ContractCall } from 'ethers-tools';
import { ethers } from 'ethers';

const RPC_URL = 'https://eth.llamarpc.com';
const PROVIDER = new ethers.JsonRpcProvider(RPC_URL);

const RegistryAbi = '<abi>';
class RegistryContract extends Contract {
  constructor() {
    super(RegistryAbi, '0xbaA999AC55EAce41CcAE355c77809e68Bb345170', PROVIDER);
  }

  getAddressesProvidersListCall(): ContractCall {
    return this.getCall('getAddressesProvidersList');
  }

  owner(): Promise<string> {
    return this.call<string>('owner');
  }

  getOwnerCall(): ContractCall {
    return this.getCall('owner');
  }
}


// ....

const registry = new RegistryContract(PROVIDER);
const unit = new MulticallUnit(PROVIDER); // Unit-of-Work - like

const listCall = registry.getAddressesProvidersListCall();
const listCallTag = 'listCall';
unit.add(listCallTag, listCall);

const ownerCall = registry.getOwnerCall();
const ownerCallTag = 'ownerCall';
unit.add(ownerCallTag, ownerCall);

const result: boolean = await unit.run();

const list = unit.getArray<string[]>(
  listCallTag,
  listCall.method,
  registry.interface
);
const owner = unit.getSingle<string>(
  ownerCallTag,
  ownerCall.method,
  registry.interface
);
const directOwner = await registry.owner();

console.log(result);
console.log(owner === directOwner);
console.log(JSON.stringify(list));
```

#### Expected output

```
true  
true  
["0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e","0xcfBf336fe147D643B9Cb705648500e101504B16d","0xeBa440B438Ad808101d1c451C1C5322c90BEFCdA"]
```

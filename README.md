# ethers-tools

[![npm version](https://badge.fury.io/js/ethers-tools.svg)](https://badge.fury.io/js/ethers-tools)

### Installation

`npm i ethers-tools`

## Description

**ethers-tools** is a lightweight JavaScript/TypeScript library built on top of [ethers.js](https://github.com/ethers-io/ethers.js)  
designed to simplify **smart contract** interactions and [multicall3](https://www.multicall3.com/) aggregation  
on the Ethereum blockchain and other EVM-compatible networks.

## Usage example

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

const listCallTag = 'listCall';
unit.add(listCallTag, registry.getAddressesProvidersListCall());

const ownerCallTag = 'ownerCall';
unit.add(ownerCallTag, registry.getOwnerCall());

const result: boolean = await unit.run();

const list = unit.getArray<string[]>(listCallTag);
const owner = unit.getSingle<string>(ownerCallTag);
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

## Contract

### Driver

The driver is either a `signer` or a `provider`. The contract's ability to make calls depends on it.
An error will occur if you try to call the contract without it, especially when making a non-static call without
providing an ethers `Wallet` as the driver.

### Fields

- `.isCallable` // Flag that indicates whether calls (static or non-static) can be made.
- `.isReadonly` // // Flag that indicates whether only static calls are allowed (false if non-static calls are possible).
- `.address` // Address of contract.
- `.interface` // Ethers contract interface.
- `.contract` // 'Bare' ethers contract.

### Methods

- `call<T = unknown>(methodName: string, args?: any[]): Promise<T>` // Performs a single on-chain call for the contract. Throws an error if unable to execute.
- `(methodName: string, args?: any[], callData?: Partial<ContractCall>): ContractCall` // Creates a `ContractCall` for `MulticallUnit`. Throws an error if unable to create.

#### ContractCall

```typescript
export type ContractCall = {
  method: string;
  target: string;
  allowFailure: boolean;
  callData: string;
  stateMutability: StateMutability;
  contractInterface: ethers.Interface;
};
export declare enum StateMutability {
  View = 'view',
  Pure = 'pure',
  NonPayable = 'nonpayable',
  Payable = 'payable',
}
```

## MulticallUnit

### Tags

Tags serve as unique references for your specific calls.
They support [single values, arrays, and records](/types/entities/multicall-tags.d.ts).  
This can be useful for complex calls.

```typescript
type Keyable = string | number | symbol;
type Tagable = Keyable | bigint;

export type MulticallTags = Tagable | Tagable[] | Record<Keyable, Tagable>;
```

### Fields

- `.tags` // Array of provided tags.
- `.calls` // Array of provided calls.
- `.response` // Array of whole response.
- `.success` // Flag that indicates whether all calls were successful.
- `.static` // Flag that indicates whether all calls are static (view-only).

### Methods

- `clear(): void` // Completely clears the Unit for reuse.
- `add(tags: MulticallTags, contractCall: ContractCall): MulticallTags` // Add new call.
- `run(): Promise<boolean>` // Executes the multicall operation.
- `getSingle<T>(tags: MulticallTags): T | undefined` // Get single primitive value as result.
- `getArray<T>(tags: MulticallTags): T | undefined` // Get array as result.
- `getRaw(tags: MulticallTags): string | undefined;` // Get raw multicall result.
- `isSuccess(tags: MulticallTags): boolean | undefined` // Check if call finished successfully.

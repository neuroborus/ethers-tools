# ethers-tools

[![npm version](https://badge.fury.io/js/ethers-tools.svg)](https://badge.fury.io/js/ethers-tools)

## Description

**ethers-tools** is a lightweight zero-dependency JavaScript/TypeScript library built on top of [ethers.js](https://github.com/ethers-io/ethers.js)
designed to simplify **smart contract** interactions and [multicall3](https://www.multicall3.com/) aggregation
on the Ethereum blockchain and other EVM-compatible networks.  
All of these tools are compatible with TypeScript and pure JavaScript.  
JSDoc is provided.

### Installation

First, you will need **ethers**. Then, you can install:

`npm i ethers-tools`  
`yarn add ethers-tools`  
`pnpm add ethers-tools`

## Quickstart

```typescript
import { ethers } from 'ethers';
import { Contract, ContractCall, MulticallUnit } from 'ethers-tools';

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
providing an ethers `Signer` (e.g, `Wallet`) as the driver.

### Fields

- `.address` // Address of contract.
- `.isCallable` // Flag that indicates whether calls (static or non-static) can be made.
- `.isReadonly` // Flag that indicates whether only static calls are allowed (false if non-static calls are possible).
- `.interface` // Ethers contract interface.
- `.contract` // 'Bare' ethers Contract.
- `.provider` // Ethers Provider.
- `.signer` // Ethers Signer.

### Methods

```
constructor(
  abi: Interface | InterfaceAbi, // ABI of the contract
  address?: string, // Address of the contract
  driver?: Signer | Provider,
  callsOptions?: CallOptions, // Default call options for each call.
);
```

- `call<T = unknown>(methodName: string, args?: any[], options?: CallOptions): Promise<T>` // Performs a single on-chain call for the contract. Throws an error if unable to execute.
- `getCall(methodName: string, args?: any[], callData?: Partial<ContractCall>): ContractCall` // Creates a `ContractCall` for `MulticallUnit`. Throws an error if unable to create. You can do force replacement with a `callData` parameter.

#### CallOptions

```typescript
export interface CallOptions {
  forceMutability?: CallMutability; // By default, Contract/MulticallUnit automatically detects the mutability of the method(s). You can force it.
  highPriorityTx?: boolean; // If activated, calls as "high priority tx": multiply gasPrice and gasLimit by multiplier. It takes additional requests to get them.
  priorityOptions?: PriorityCallOptions; // Only matters if `highPriorityTx` is activated
}
export interface PriorityCallOptions {
  asynchronous?: boolean; // Can be a little faster if provider allows (simultaneously getting gasPrice & gasLimit).
  chainId?: bigint; // Manually set. (Prevents replay attacks by ensuring the transaction is valid only for the intended blockchain network)
  provideChainId?: boolean; // Automatic - additional async request. (Prevents replay attacks by ensuring the transaction is valid only for the intended blockchain network)
  multiplier?: number; // Multiplier for gasPrise and gasLimit values.
}
```

#### ContractCall

```typescript
export type ContractCall = {
  method: string; // Name of the method.
  target: string; // Address of contract.
  allowFailure: boolean; // Failure allowance - false by default (*).
  callData: string; // Encoded function data - uses in multicall.
  stateMutability: StateMutability; // Shows mutability of the method.
  contractInterface: ethers.Interface; // Interface of the callable contract. Uses for answer decoding.
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
- `.executing` // Flag that indicates if `run()` already executing.

### Methods

```
constructor(
  driver: Signer | Provider,
  options?: MulticallOptions, // Default options for the each run.
  multicallAddress?: string, // You can use any address. Useful for less popular networks.
);
```

- `run(options?: MulticallOptions): void` // Completely clears the Unit for reuse.
- `add(tags: MulticallTags, contractCall: ContractCall): MulticallTags` // Add new call.
- `run(): Promise<boolean>` // Executes the multicall operation.
- `getSingle<T>(tags: MulticallTags): T | undefined` // Get single primitive value as result.
- `getArray<T>(tags: MulticallTags, deep?: boolean): T | undefined` // Get array as result.
- `getRaw(tags: MulticallTags): string | TransactionResponse | TransactionReceipt | undefined;` // Get the raw multicall result. Returns TransactionResponse if a mutable call has been processed. Returns TransactionReceipt if the `waitForTxs` flag was turned on.
- `isSuccess(tags: MulticallTags): boolean | undefined` // Check if call finished successfully.

#### MulticallOptions

```typescript
export interface MulticallOptions {
  maxCallsStack?: number; // The maximum size of one execution. If it overfills, the multicall performs additional executions.
  forceMutability?: CallMutability; // Allows to force mutability. It will try to call as static or mutable if you want to.
  waitForTxs?: boolean; // Wait for every transaction. Turned on by default for nonce safety.
  highPriorityTxs?: boolean; // You can make priority transaction when it is necessary. Requires more calls, but will be processed more quickly.
  priorityOptions?: PriorityCallOptions; // Only matters if `highPriorityTxs` is turned on.
}
export enum CallMutability {
  Static = 'STATIC',
  Mutable = 'MUTABLE',
}
```

#### Warning

Since in the case of a **mutable call**, the result is not returned but rather **a transaction or a receipt**,
`getRaw` for a single **call stack** will provide the same information.
As a result, using `allowFailure` will lead to inconsistent results.
When using `allowFailure`, _make sure that you do not need to track the outcome of a specific execution_.

## Other

#### Helpers

```typescript
export declare const priorityCall: (
  // Function that allows making custom priority calls
  provider: Provider,
  signer: Signer,
  contract: Contract,
  method: string,
  args: any[],
  options: PriorityCallOptions
) => Promise<TransactionResponse>;
```

```typescript
export declare const waitForAddressTxs: (
  // Function that waits for the end of all users transactions
  address: string,
  provider: Provider,
  delayMs?: number
) => Promise<void>;
```

```typescript
export declare const isStaticMethod: (
  // Accepts mutability and says if method is static
  state: StateMutability | string
) => boolean;
```

```typescript
export declare const isStaticArray: (calls: ContractCall[]) => boolean; // Accepts array of ContractCalls and says if all methods are static
```

#### Entities

```typescript
export enum Chain { // Contains more than 250 different chains. Supports JS as struct. All of these chains right now supports multicall3.
  Mainnet = 1,
  Kovan = 42,
  Rinkeby = 4,
  // And other 250+ chains...
}
```

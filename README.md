# ethers-tools

[![npm version](https://badge.fury.io/js/ethers-tools.svg)](https://badge.fury.io/js/ethers-tools)

## Description

**ethers-tools** is a lightweight zero-dependency JavaScript/TypeScript library built on top of [ethers.js](https://github.com/ethers-io/ethers.js)
designed to simplify **smart contract** interactions and [multicall3](https://www.multicall3.com/) aggregation
on the Ethereum blockchain and other EVM-compatible networks.  
All of these tools are compatible with TypeScript and pure JavaScript.  
JSDoc is provided.

### Installation

First, you will need **ethers** v6. Then, you can install:

`npm i ethers-tools`  
`yarn add ethers-tools`  
`pnpm add ethers-tools`

## Quickstart

```typescript
import { ethers } from 'ethers';
import { Contract, ContractCall, MulticallUnit } from 'ethers-tools';

const RPC_URL = 'https://eth.llamarpc.com';
const ADDRESS = '0xbaA999AC55EAce41CcAE355c77809e68Bb345170';
const PROVIDER = new ethers.JsonRpcProvider(RPC_URL);

const RegistryAbi = '<abi>';
class RegistryContract extends Contract {
  constructor() {
    // Can be passed here
    super(RegistryAbi, ADDRESS, PROVIDER);
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

// USING MULTICALL EXAMPLE

const registry = new RegistryContract();
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

// LISTENING EVENTS EXAMPLE

const data: Set<{ address: string; id: bigint }> = new Set();
// Start listening
registry.listenEvent(
  'AddressesProviderRegistered',
  (addressesProvider: string, id: bigint) => {
    data.add({
      addressesProvider,
      id,
    });
  }
);
// Find historical data for the last 30000 blocks
for await (const log of registry.getLogsStream(-30000, [
  'AddressesProviderRegistered',
])) {
  if (!log) continue;

  const parsedLog = registry.contract.interface.parseLog(log);
  if (parsedLog) {
    data.add(parsedLog.args);
  }
}
```

#### Expected output

```
true
true
["0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e","0xcfBf336fe147D643B9Cb705648500e101504B16d","0xeBa440B438Ad808101d1c451C1C5322c90BEFCdA"]
```

## Contract

### Description

[Contract](/src/contract/contract.js) is a parent class for contract classes that includes basic state getters and methods for calling the contract
directly or obtaining a `ContractCall` for use in **MulticallUnit**. These methods can be parameterized.

### Driver

The driver is either a `Signer` or a `Provider`. The contract's ability to make calls depends on it.
An error will occur if you try to call the contract without it, especially when making a mutable call without
providing an ethers `Signer` (e.g, `Wallet`) as the driver.

### Fields

- `.address` // Address of contract.
- `.callable` // Flag that indicates whether calls (static or mutable) can be made.
- `.readonly` // Flag that indicates whether only static calls are allowed (false if mutable calls are possible).
- `.interface` // Ethers contract interface.
- `.contract` // 'Bare' ethers Contract.
- `.provider` // Ethers Provider.
- `.signer` // Ethers Signer.

### Methods

```
  constructor(
    abi: Interface | InterfaceAbi,
    address?: string,
    driver?: Signer | Provider,
    options?: ContractOptions
  );
```

- `call<T = unknown>(methodName: string, args?: any[], options?: CallOptions): Promise<T>` // Performs a single on-chain call for the contract. Throws an error if unable to execute.
- `getCall(methodName: string, args?: any[], callData?: Partial<ContractCall>): ContractCall` // Creates a `ContractCall` for `MulticallUnit`. Throws an error if unable to create. You can do force replacement with a `callData` parameter.
- `listenEvent(eventName: string, listener: Listener): Promise<Contract>` // Creates event listener on the contract. WebsocketProvider is required.
- `getLogs(fromBlock: number, eventsNames?: string[], toBlock?: number, options?: ContractGetLogsOptions): Promise<Log[]>` // Synchronous log retrieval. 'fromBlocks' can have a minus sign, which means 'n blocks ago'.
- `getLogsStream(fromBlock: number, eventsNames?: string[], toBlock?: number, options?: ContractGetLogsOptions): AsyncGenerator<Log, void, unknown>` // Asynchronous way to getting logs

#### ContractOptions

```typescript
export interface ContractOptions {
  forceMutability?: CallMutability; // By default, Contract/MulticallUnit automatically detects the mutability of the method(s). You can force it.
  highPriorityTxs?: boolean; // If activated, calls as "high priority tx": multiply gasPrice and gasLimit by multiplier. It takes additional requests to get them.
  priorityOptions?: PriorityCallOptions; // Only matters if `highPriorityTx` is activated.
  logsBlocksStep?: number; // Quantity of processed blocks per iteration during log parsing.
  logsDelayMs?: number; // Delay between log parsing iterations.
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
  allowFailure: boolean; // Failure allowance - false by default (*). DEFAULT: false
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

#### ContractGetLogsOptions

```typescript
export interface ContractGetLogsOptions {
  blocksStep?: number; // Quantity of processed blocks per iteration during log parsing
  delayMs?: number; // Delay between log parsing iterations.
}
```

## MulticallUnit

### Description

[MulticallUnit](/src/multicall/multicall-unit.js) is a tool that takes a calls (`ContractCall`). When the `run()` method is invoked,
it splits the stored calls into mutable and static, prioritizing mutable calls. It then processes them by stacks.
The size of the concurrently processed call stack for mutable and static calls can be adjusted separately via
`MulticallOptions`, along with other parameters.

### Tags

Tags serve as unique references for your specific calls.
They support [single values, arrays, and records](/types/entities/multicall-tags.d.ts).  
This can be useful for complex calls.

```typescript
export type Keyable = string | number | symbol;
export type Tagable = Keyable | bigint;

export type MulticallTags = Tagable | Tagable[] | Record<Keyable, Tagable>;
```

### Fields

- `.tags` // Array of provided tags.
- `.calls` // Array of provided calls.
- `.response` // Array of whole response.
- `.success` // Flag that indicates whether all calls were successful.
- `.static` // Flag that indicates whether all calls are static (not mutable).
- `.executing` // Flag that indicates if `run()` executing at the moment.

### Methods

```
constructor(
  driver: Signer | Provider,
  options?: MulticallOptions, // Default options for the each run.
  multicallAddress?: string, // You can use any address. Useful for less popular networks.
);
```

- `clear(): void` // Completely clears the Unit for reuse.
- `add(tags: MulticallTags, contractCall: ContractCall): MulticallTags` // Add new call.
- `run(): Promise<boolean>` // Executes the multicall operation.
- `getSingle<T>(tags: MulticallTags): T | undefined` // Get single primitive value as result.
- `getArray<T>(tags: MulticallTags, deep?: boolean): T | undefined` // Get array as result.
- `getRaw(tags: MulticallTags): string | TransactionResponse | TransactionReceipt | undefined;` // Get the raw multicall result. Returns TransactionResponse if a mutable call has been processed. Returns TransactionReceipt if the `waitForTxs` flag was turned on.
- `isSuccess(tags: MulticallTags): boolean | undefined` // Check if call finished successfully.

#### MulticallOptions

```typescript
export interface MulticallOptions {
  maxStaticCallsStack?: number; // The maximum size of one static execution. If it overfills, the multicall performs additional executions. DEFAULT: 50
  maxMutableCallsStack?: number; // The maximum size of one mutable execution. If it overfills, the multicall performs additional executions. DEFAULT: 10
  forceMutability?: CallMutability; // Allows to force mutability. It will try to call as static or mutable if you want to.
  waitForTxs?: boolean; // Wait for every transaction. Turned on by default for nonce safety. DEFAULT: true
  highPriorityTxs?: boolean; // You can make priority transaction when it is necessary. Requires more calls, but will be processed more quickly.
  priorityOptions?: PriorityCallOptions; // Only matters if `highPriorityTxs` is turned on.
}
export enum CallMutability {
  Static = 'STATIC',
  Mutable = 'MUTABLE',
}
```

#### Warning (\*)

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

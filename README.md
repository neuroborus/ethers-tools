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

#### Multicall usage

```typescript
import { ethers } from 'ethers';
import { Contract, ContractCall, MulticallUnit } from 'ethers-tools';

/**
 * --- Setup ---
 */

const RPC_URL = 'https://eth.llamarpc.com';
const ADDRESS = '0xbaA999AC55EAce41CcAE355c77809e68Bb345170';
const PROVIDER = new ethers.WebSocketProvider(RPC_URL);

/**
 * --- Contract Definition ---
 */

const RegistryAbi = '<abi>';
class RegistryContract extends Contract {
  constructor(address: string, provider: Provider) {
    super(RegistryAbi, address, provider);
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

/**
 * --- Using Multicall ---
 */

const registry = new RegistryContract(ADDRESS, PROVIDER);
const unit = new MulticallUnit(PROVIDER); // Unit-of-Work - like

// Add calls to unit
unit.add(registry.getAddressesProvidersListCall());
unit.add(registry.getOwnerCall());
// Execute multicall
const result: boolean = await unit.run();
const [list, owner] = unit.getAll<[string[], string]>();

/*
 * Alternatively, both can be retrieved using tags (tags are highly flexible references and can be created manually):
 *
 * const listCallTag = unit.add(registry.getAddressesProvidersListCall());
 * const ownerCallTag = unit.add(registry.getOwnerCall(), 'ownerCallTag');
 *
 * // Execute multicall
 * const result: boolean = await unit.run();
 *
 * // Retrieve results
 * // - Returned as an Object if the response has named fields
 * // - Otherwise returned as an Array or Single value
 * const list = unit.get<string[]>(listCallTag);
 * const owner = unit.get<string>(ownerCallTag);
 */

console.log(result);
const directOwner = await registry.owner();
console.log(owner === directOwner);
console.log(JSON.stringify(list));
```

#### Expected output

```
true
true
["0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e","0xcfBf336fe147D643B9Cb705648500e101504B16d","0xeBa440B438Ad808101d1c451C1C5322c90BEFCdA"]
```

#### Events listening

```typescript
/**
 * --- Listening to Events ---
 */
const data: Set<{ address: string; id: bigint }> = new Set();
// Realtime listening
registry.listenEvent(
  'AddressesProviderRegistered',
  (addressesProvider: string, id: bigint) => {
    data.add({
      addressesProvider,
      id,
    });
  }
);
// Historical logs from last 30,000 blocks
for await (const dLog of registry.getLogsStream(-30000, [
  'AddressesProviderRegistered',
])) {
  data.add(dLog);
}
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
- `getLogsStream(fromBlock: number, eventsNames?: string[], toBlock?: number, options?: ContractGetLogsOptions): AsyncGenerator<Log, void, unknown>` // Asynchronous way to getting logs.

#### ContractOptions

```typescript
export interface ContractOptions {
  forceMutability?: CallMutability; // By default, Contract/MulticallUnit automatically detects the mutability of the method(s). You can force it.
  highPriorityTxs?: boolean; // If activated, calls as "high priority tx": multiply gasPrice and gasLimit by multiplier. It takes additional requests to get them.
  priorityOptions?: PriorityCallOptions; // Only matters if `highPriorityTx` is activated.
  logsBlocksStep?: number; // Quantity of processed blocks per iteration during log parsing.
  logsDelayMs?: number; // Delay between log parsing iterations.
  signals?: AbortSignal[]; // Can be passed for abort signal control
  staticCallsTimeoutMs?: number; // Timeout for static calls in ms. DEFAULT: 10000
  mutableCallsTimeoutMs?: number; // Timeout for mutable calls in ms. DEFAULT: 20000
}
export interface PriorityCallOptions {
  asynchronous?: boolean; // Can be a little faster if provider allows (simultaneously getting gasPrice & gasLimit).
  chainId?: bigint; // Manually set. (Prevents replay attacks by ensuring the transaction is valid only for the intended blockchain network)
  provideChainId?: boolean; // Automatic - additional async request. (Prevents replay attacks by ensuring the transaction is valid only for the intended blockchain network)
  multiplier?: number; // Multiplier for gasPrise and gasLimit values.
  signals?: AbortSignal[]; // Can be passed for abort signal control
  timeoutMs?: number; // Timeout in milliseconds. If not provided, there is no default option.
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

- `add(contractCall: ContractCall, tags?: MulticallTags): MulticallTags` // Add new call. Returns Tags as reference.
- `run(options?: MulticallOptions): Promise<boolean>` // Executes the multicall operation.
- `get<T>(tags: MulticallTags): T | null` // Returns the decoded result for the specified tag.
- `getOrThrow<T>(tags: MulticallTags): T` // Same as get(), but throws an error if the result is missing or cannot be decoded.
- `getAll<T>(deep?: boolean): T` // Returns all decoded results for all registered tags. If deep is true, nested structures will also be deeply converted to plain objects/arrays when applicable.
- `getAllOrThrow<T>(deep?: boolean): T` // Same as getAll(), but throws an error if any expected result is missing or not decodable.
- `getSingle<T>(tags: MulticallTags): T | undefined` // Get single primitive value as result.
- `getSingleOrThrow<T>(tags: MulticallTags): T;` // The same but throws an error if not found.
- `getArray<T>(tags: MulticallTags, deep?: boolean): T | undefined` // Get array as result.
- `getArrayOrThrow<T>(tags: MulticallTags, deep?: boolean): T` // The same but throws an error if not found.
- `getObject<T>(tags: MulticallTags, deep?: boolean): T | undefined` // Get object as result. Works with named fields in ABI.
- `getObjectOrThrow<T>(tags: MulticallTags, deep?: boolean): T` // The same but throws an error if not found.
- `getRaw(tags: MulticallTags): string | TransactionResponse | TransactionReceipt | undefined` // Get the raw multicall result. Returns TransactionResponse if a mutable call has been processed. Returns TransactionReceipt if the `waitForTxs` flag was turned on.
- `isSuccess(tags: MulticallTags): boolean | undefined` // Check if call finished successfully.
- `clear(): void` // Completely clears the Unit for reuse.

#### MulticallOptions

```typescript
export interface MulticallOptions {
  forceMutability?: CallMutability; // Allows to force mutability. It will try to call as static or mutable if you want to.
  waitForTxs?: boolean; // Wait for every transaction. Turned on by default for nonce safety. DEFAULT: true
  highPriorityTxs?: boolean; // You can make priority transaction when it is necessary. Requires more calls, but will be processed more quickly.
  priorityOptions?: PriorityCallOptions; // Only matters if `highPriorityTxs` is turned on.
  maxStaticCallsStack?: number; // The maximum size of one static execution. If it overfills, the multicall performs additional executions. DEFAULT: 50
  maxMutableCallsStack?: number; // The maximum size of one mutable execution. If it overfills, the multicall performs additional executions. DEFAULT: 10
  signals?: AbortSignal[]; // Can be passed for abort signal control
  staticCallsTimeoutMs?: number; // Timeout for static calls in ms. DEFAULT: 10000
  mutableCallsTimeoutMs?: number; // Timeout for mutable calls in ms. DEFAULT: 20000
  waitCallsTimeoutMs?: number; // Timeout for waiting in ms. DEFAULT: 30000
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

## Config

In addition to setting configuration at specific points—such as when creating objects or making calls—you can also modify
the **global configuration** for the entire project.

```typescript
import { config } from 'ethers-tools';

config.multicallUnit.mutableCalls.stackLimit = 3;
```

```typescript
export type Config = {
  multicallUnit: {
    /** Multicall contract address */
    address: string;

    /** If true, allows individual call failures without failing the entire batch */
    allowFailure: boolean;

    /** If true, waits for transaction confirmations in mutable calls */
    waitForTxs: boolean;

    /** Settings for read-only (eth_call) operations */
    staticCalls: {
      /** Maximum number of static calls per batch */
      stackLimit: number;

      /** Timeout for each static call in milliseconds */
      timeoutMs: number;
    };

    /** Settings for state-changing (eth_sendTransaction) operations */
    mutableCalls: {
      /** Maximum number of mutable calls per batch */
      stackLimit: number;

      /** Timeout for each mutable call in milliseconds */
      timeoutMs: number;
    };

    /** Settings for waiting on call results */
    waitCalls: {
      /** Timeout for awaiting results of batched calls */
      timeoutMs: number;
    };

    /** Settings for prioritizing certain calls */
    priorityCalls: {
      /** Priority multiplier to determine weight/importance of selected calls */
      multiplier: number;
    };
  };

  contract: {
    /** Global static call timeout for individual contract methods */
    staticCalls: {
      /** Timeout for static contract calls in milliseconds */
      timeoutMs: number;
    };

    /** Global mutable call timeout for individual contract methods */
    mutableCalls: {
      /** Timeout for mutable contract calls in milliseconds */
      timeoutMs: number;
    };

    /** Parameters for event log fetching and listening */
    logsGathering: {
      /** Number of blocks to query per log fetch request */
      blocksStep: number;

      /** Delay between log fetch requests in milliseconds */
      delayMs: number;
    };
  };

  /** Default priority settings for individual call execution */
  priorityCalls: {
    /** Default multiplier for priority call handling */
    multiplier: number;
  };
};
```

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

```typescript
export declare const multicallGenerateTag: () => string; // Generates Tag for Multicall Unit
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

#### Utilities

```typescript
// Check AbortSignal[] and throw if any signal is aborted.
export declare const checkSignals: (signals: AbortSignal[]) => void;
```

```typescript
// Create a promise for signals to use in race conditions
export declare const createSignalsPromise: (
  signals: AbortSignal[]
) => Promise<never>;
```

```typescript
// Create a signal from a timeout in milliseconds.
export declare const createTimeoutSignal: (ms: number) => AbortSignal;
```

```typescript
// Race the provided function (racer) with the given signals.
export declare const raceWithSignals: <T>(
  racer: () => Promise<T>,
  signals?: AbortSignal[]
) => Promise<T>;
```

```typescript
// Wait while listening to signals
export declare const waitWithSignals: (
  ms: number,
  signals?: AbortSignal[]
) => Promise<void>;
```

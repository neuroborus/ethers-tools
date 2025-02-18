import { Interface, JsonRpcProvider } from 'ethers';
import { Contract } from '../contract';
import { ContractCall } from './contract-call';

export type Unit = [string, ContractCall];
export type Result = [string, unknown];
export type Response = [success: boolean, rawData: string];

export interface SplitData {
    tags: string[];
    calls: ContractCall[];
}

export declare class MulticallUnit extends Contract {
    protected units: Unit[];
    protected results: Result[];
    protected rawData: Map<string, string>;
    protected lastSuccess?: boolean;

    constructor(provider: JsonRpcProvider);

    add(tag: string, contractCall: ContractCall): string;

    get rawResults(): Result[];
    get success(): boolean | undefined;

    getRaw(tag: string): string | undefined;

    getSingle<T>(tag: string, methodName: string, contractInterface: Interface): T | undefined;
    getArray<T>(tag: string, methodName: string, contractInterface: Interface): T | undefined;

    run(): Promise<boolean>;
}

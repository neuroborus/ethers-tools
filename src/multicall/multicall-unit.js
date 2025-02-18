import { Interface, JsonRpcProvider } from 'ethers';
import { Multicall3Abi } from '../abis/index.js';
import { MULTICALL_ADDRESS } from '../constants.js';
import { Contract } from '../contract/index.js';

/**
 * @typedef {[string, import('./contract-call.js').ContractCall]} Unit
 * @typedef {[string, unknown]} Result
 * @typedef {[boolean, string]} Response
 * @typedef {{ tags: string[], calls: import('./contract-call.js').ContractCall[] }} SplitData
 */

/**
 * @param {Response[]} responses
 * @returns {boolean}
 */
const isSuccess = (responses) => responses.every((el) => el[0]);

export class MulticallUnit extends Contract {
    /** @type {Unit[]} */
    units = [];

    /** @type {Result[]} */
    results = [];

    /** @type {Map<string, string>} */
    rawData = new Map();

    /** @type {boolean | undefined} */
    lastSuccess;

    /**
     * @param {JsonRpcProvider} provider
     */
    constructor(provider) {
        super(Multicall3Abi, MULTICALL_ADDRESS, provider);
    }

    /**
     * @param {string} tag
     * @param {import('./contract-call.js').ContractCall} contractCall
     * @returns {string}
     */
    add(tag, contractCall) {
        this.units.push([tag, contractCall]);
        return tag;
    }

    /**
     * @returns {Result[]}
     */
    get rawResults() {
        return this.results;
    }

    /**
     * @returns {boolean | undefined}
     */
    get success() {
        return this.lastSuccess;
    }

    /**
     * @param {string} tag
     * @returns {string | undefined}
     */
    getRaw(tag) {
        return this.rawData.get(tag);
    }

    /**
     * @template T
     * @param {string} tag
     * @param {string} methodName
     * @param {Interface} contractInterface
     * @returns {T | undefined}
     */
    getSingle(tag, methodName, contractInterface) {
        const raw = this.rawData.get(tag);
        if (!raw) return undefined;
        return contractInterface.decodeFunctionResult(methodName, raw)[0];
    }

    /**
     * @template T
     * @param {string} tag
     * @param {string} methodName
     * @param {Interface} contractInterface
     * @returns {T | undefined}
     */
    getArray(tag, methodName, contractInterface) {
        const raw = this.rawData.get(tag);
        if (!raw) return undefined;
        return Object.values(
            contractInterface.decodeFunctionResult(methodName, raw)[0],
        );
    }

    /**
     * @returns {Promise<boolean>}
     */
    async run() {
        /** @type {SplitData} */
        const split = this.units.reduce(
            (acc, [tag, call]) => {
                acc.tags.push(tag);
                acc.calls.push(call);
                return acc;
            },
            { tags: [], calls: [] }
        );

        if (!this.contract.aggregate3) {
            throw new Error("Fatal: aggregate3 doesn't exist!");
        }
        /** @type {Response[]} */
        const response = await this.contract.aggregate3.staticCall(split.calls);

        this.results = split.tags.reduce((acc, tag, index) => {
            const data = response[index];
            if (!data) return acc;
            this.rawData.set(tag, data[1]);
            acc.push([tag, data]);
            return acc;
        }, []);

        this.lastSuccess = isSuccess(response);
        return this.lastSuccess;
    }
}

import { Contract as EthersContract } from 'ethers';

/**
 * Base contract.
 */
export class Contract {
    /**
     * @type {EthersContract}
     * @protected
     */
    contract;

    /**
     * @type {boolean}
     * @public
     */
    isCallable;

    /**
     * @param {import('ethers').Interface | import('ethers').InterfaceAbi} abi
     * @param {string} [address]
     * @param {import('ethers').JsonRpcProvider} [provider]
     */
    constructor(
        abi,
        address = '0x0000000000000000000000000000000000000000',
        provider
    ) {
        /**
         * @readonly
         * @type {string}
         */
        this.address = address;

        /**
         * @readonly
         * @protected
         * @type {import('ethers').JsonRpcProvider | undefined}
         */
        this.provider = provider;

        this.isCallable = !!address && !!provider;
        this.contract = new EthersContract(address, abi, provider);
    }

    get interface() {
        return this.contract.interface;
    }
}
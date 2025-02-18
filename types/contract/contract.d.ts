import { Contract as EthersContract, Interface, InterfaceAbi, JsonRpcProvider } from 'ethers';

export declare class Contract {
    public readonly contract: EthersContract;
    public readonly isCallable: boolean;
    public readonly address: string;
    protected readonly provider?: JsonRpcProvider;

    constructor(
        abi: Interface | InterfaceAbi,
        address?: string,
        provider?: JsonRpcProvider
    );

    get interface(): Interface;
}

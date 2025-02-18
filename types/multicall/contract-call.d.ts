export type ContractCall = {
    method: string;
    target: string;
    allowFailure: true;
    callData: string;
}

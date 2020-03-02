import Web3 from 'web3';
export default class Web3Client {
    web3: Web3;
    private options;
    constructor(provider: any, options: any);
    deploy(abi: any, bytecode: any, args: any): Promise<string>;
    transaction(abi: any, address: any, method: any, args: any): Promise<unknown>;
    isConfirmed(txHash: string, blocks: any): Promise<boolean>;
}

export default class Worker {
    private queue;
    private web3Client;
    private artifactsDir;
    private buildFolder;
    private blockConfirmation;
    constructor(provider: any, QClient: any, options: any, buildFolder: any, blockConfirmation: any);
    start(q: any): void;
    private _getJobStatus;
    private _onJobCompletion;
    handleEnd(msg: any): Promise<void>;
    handleTransaction(job: any): Promise<void>;
    handleDeploy(job: any): Promise<void>;
    waitForConfirmation(jobId: any): Promise<import("web3/types").TransactionReceipt>;
    private _getStatus;
    private _writeStatusToFile;
    private _getArtifact;
    static delay(s: number): Promise<unknown>;
    static validateBytecode(bytecode: any): boolean;
    linkBytecode(bytecode: any): any;
    private _getAddressForContract;
    private _processArgs;
}

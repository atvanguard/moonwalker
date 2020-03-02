export default class Sender {
    private queue;
    constructor(QClient: any);
    initialize(): Promise<void>;
    deploy(msg: string, q?: string): Promise<void>;
}

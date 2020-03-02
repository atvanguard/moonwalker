export declare class QClient {
    channel: any;
    conn: any;
    constructor();
    initialize(): Promise<any>;
    createChannel(): Promise<any>;
    sendToQueue(queue: any, msg: string): Promise<any>;
    consume(q: any, callback: any, options: any): Promise<any>;
}
export default function getQueue(): Promise<QClient>;

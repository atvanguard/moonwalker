import { QClient } from './QClient'
import Web3Client from './Web3Client'

export default class Sender {
  private queue: QClient
  private web3Client: Web3Client
  private writeLocation: string

  constructor(QClient) {
    this.queue = QClient
    // this.web3Client = new Web3Client(provider);
  }

  async initialize() {
    await this.queue.initialize()
  }

  async deploy(msg: string) {
    const q = 'hello2'
    await this.queue.sendToQueue(q, msg)
    console.log(" [x] Sent");
  }

  // async deployLib(msg) {
  //   await this.queue.sendToQueue(msg)
  //   console.log(" [x] Sent %s", msg);
  // }
}

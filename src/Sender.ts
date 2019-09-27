import { QClient } from './QClient'

export default class Sender {
  private queue: QClient

  constructor(QClient) {
    this.queue = QClient
  }

  async initialize() {
    await this.queue.initialize()
  }

  async deploy(msg: string) {
    const q = 'deposit-test-1'
    await this.queue.sendToQueue(q, msg)
    console.log(" [x] Sent", JSON.parse(msg).contract);
  }
}

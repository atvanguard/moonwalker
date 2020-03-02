import { QClient } from './QClient'

export default class Sender {
  private queue: QClient

  constructor(QClient) {
    this.queue = QClient
  }

  async initialize() {
    await this.queue.initialize()
  }

  async deploy(msg: string, q = 'default-deposit-q') {
    await this.queue.sendToQueue(q, msg)
    console.log("[x] Queued", JSON.parse(msg).contract);
  }
}

// import amqp from 'amqplib/callback_api'
const amqp = require('amqplib')

export class QClient {
  public channel;
  public conn;

  constructor() {}

  async initialize() {
    this.conn = await amqp.connect('amqp://localhost:5672');
    return this.createChannel()
  }

  async createChannel() {
    this.channel = await this.conn.createChannel();
    return this.channel.prefetch(1)
  }

  async sendToQueue(queue, msg: string) {
    await this.channel.assertQueue(queue, {
      durable: false
    });

    // console.log(" [x] Sending %s", msg);
    return this.channel.sendToQueue(queue, Buffer.from(msg));
  }

  async consume(q, callback, options) {
    await this.channel.assertQueue(q, { durable: false });
    return this.channel.consume(q, callback, options)
  }
}

export default async function getQueue() {
  const q = new QClient()
  await q.initialize()
  return q
}

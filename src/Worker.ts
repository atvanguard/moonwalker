import { QClient } from './QClient'
import Web3Client from './Web3Client'
import fs from 'fs'
import BN from 'bn.js'

export default class Worker {
  private queue: QClient
  private web3Client: Web3Client
  private artifactsDir: string

  constructor(provider, QClient, options, artifactsDir) {
    this.queue = QClient;
    this.web3Client = new Web3Client(provider, options);
    this.artifactsDir = artifactsDir
  }

  start(q) {
    this.queue.consume(q, async (msg) => {
      const job = JSON.parse(msg.content.toString())
      console.log("[x] Received %s", job.contract);

      // check if previous job was done
      if (job.id !=0) {
        await this.isJobComplete(job.id - 1)
        await this._writeContractAddressToFile(job.id - 1)
      }

      if (job.contract === 'finish') {
        console.log('finished, closing connection now ...')
        this.queue.channel.ack(msg)
        this.queue.channel.close()
        process.exit(0)
      }

      const artifact = this._getArtifact(job)
      if (!Worker.validateBytecode(artifact.bytecode)) {
        console.log('Invalid bytecode for', job.contract)
        throw new Error('Invalid bytecode')
      }

      const txHash = await this.web3Client.deploy(artifact.abi, artifact.bytecode, job.args)
      console.log('txHash for', job, 'is', txHash)
      const status = this._getStatus()
      status[job.id] = { contract: job.contract, txHash }
      console.log(status)
      this._writeStatusToFile(status)
      console.log('acking and closing channel now...')
      this.queue.channel.ack(msg)
      this.queue.channel.close()

      // wait for tx confirmation before consuming new messages
      await Worker.delay(2)
      await this.isJobComplete(job.id)
      console.log('opening channel again...')
      await this.queue.createChannel()
      this.start(q)
    }, {})
  }

  isJobComplete(jobId) {
    // assuming artifactsDir is same in all jobs
    const status = this._getStatus()
    const job = status[jobId]
    console.log('waiting for job', job, 'to get confirmed')
    return this.waitForConfirmation(job.txHash)
  }

  async waitForConfirmation(txHash) {
    // console.log('waiting on', txHash, 'to get confirmed...')
    while (true) {
      if (await this.web3Client.isConfirmed(txHash, 6)) {
        console.log(txHash, 'confirmed')
        break;
      }
      await Worker.delay(5)
    }
  }

  private async _writeContractAddressToFile(jobId) {
    const status = this._getStatus()
    const job = status[jobId]
    const receipt = await this.web3Client.web3.eth.getTransactionReceipt(job.txHash)
    status[jobId].address = receipt.contractAddress
    this._writeStatusToFile(status)
  }

  private _getStatus() {
    let status = {}
    const statusFile = `${this.artifactsDir}/status.json`
    if (fs.existsSync(statusFile)) {
      try {
        status = JSON.parse(fs.readFileSync(statusFile).toString())
      } catch(e) {
        console.log(e)
      }
    }
    return status
  }

  private _writeStatusToFile(status) {
    const statusFile = `${this.artifactsDir}/status.json`
    fs.writeFileSync(statusFile, JSON.stringify(status, null, 2)) // Indent 2 spaces
  }

  private _getArtifact(job) {
    return JSON.parse(fs.readFileSync(`${this.artifactsDir}/${job.contract}.json`).toString())
  }

  static delay(s: number) {
    console.log('sleeping for', s, 'secs...')
    return new Promise( resolve => setTimeout(resolve, s * 1000) );
  }

  static validateBytecode(bytecode) {
    const b = new BN(bytecode.slice(2), 'hex')
    return b.toString('hex') == bytecode.slice(2)
  }
}


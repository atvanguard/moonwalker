import { QClient } from './QClient'
import Web3Client from './Web3Client'
import fs from 'fs'

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
      if (job.id !=0) await this.isPreviousJobComplete(job)

      const artifact = this._getArtifact(job)
      const txHash = await this.web3Client.deploy(artifact.abi, artifact.bytecode, job.args)
      console.log('txHash is', txHash)
      const status = this._getStatus()
      status[job.id] = { contract: job.contract, txHash }
      console.log(status)
      this._writeStatusToFile(status)
      console.log('acking and closing channel now...')
      this.queue.channel.ack(msg)
      this.queue.channel.close()

      // wait for tx confirmation before consuming new messages
      await this.waitForConfirmation(txHash)
      console.log('opening channel again...')
      await this.queue.createChannel()
      this.start(q)
    }, {})
  }

  isPreviousJobComplete(job) {
    // assuming artifactsDir is same in all jobs
    const status = this._getStatus()
    const previousJob = status[job.id - 1]
    return this.waitForConfirmation(previousJob.txHash)

  }

  async waitForConfirmation(txHash) {
    // poll tx until it is confirmed
    let _receipt
    while (true) {
      console.log('sleeping for 2 secs...')
      await delay(2 * 1000);

      const { status, receipt } = await this.web3Client.isConfirmed(txHash)
      if (status) {
        console.log(txHash, 'confirmed')
        _receipt = receipt
        break;
      }
    }
    this._writeContractAddressToFile(txHash, _receipt.contractAddress)
  }

  private _writeContractAddressToFile(txHash, contractAddress) {
    const status = this._getStatus()
    let found = false
    Object.keys(status).forEach(id => {
      if (status[id].txHash === txHash) {
        status[id].address = contractAddress
        found = true
      }
    })
    if (!found) {
      console.log('did not find', txHash, 'in status file')
    } else {
      this._writeStatusToFile(status)
    }
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
    return JSON.parse(fs.readFileSync(`${job.artifactsDir}/${job.contract}.json`).toString())
  }
}

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}

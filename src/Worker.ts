import { QClient } from './QClient'
import Web3Client from './Web3Client'
import fs from 'fs'

export default class Worker {
  private queue: QClient
  private web3Client: Web3Client
  private artifactsDir: string
  private buildFolder: string
  private blockConfirmation: number

  constructor(provider, QClient, options, buildFolder, blockConfirmation) {
    this.queue = QClient;
    this.web3Client = new Web3Client(provider, options);
    this.buildFolder = buildFolder
    this.artifactsDir = `${buildFolder}/contracts`
    this.blockConfirmation = blockConfirmation
  }

  start(q) {
    this.queue.consume(q, async (msg) => {
      const job = JSON.parse(msg.content.toString())
      console.log("[x] Received %s", job.contract);

      // check if this job is already in progress
      const status = this._getJobStatus(job.id)
      if (status == 'progress') {
        const receipt = await this.waitForConfirmation(job.id)
        this._onJobCompletion(job, receipt)
        return this.queue.channel.ack(msg)
      } else if (status == 'complete') {
        return this.queue.channel.ack(msg)
      }

      if (job.type == 'deploy') {
        await this.handleDeploy(job)
      } else if (job.type == 'transaction') {
        await this.handleTransaction(job)
      } else if (job.type == 'end') {
        await this.handleEnd(msg)
        return
      } else {
        throw new Error('job type not recognised')
      }

      // wait for tx confirmation before consuming new messages
      await Worker.delay(2) // this is required bcoz polling the tx too soon fucks up ganache response
      const receipt = await this.waitForConfirmation(job.id)
      this._onJobCompletion(job, receipt)
      this.queue.channel.ack(msg)
    }, {})
  }

  private _getJobStatus(jobId) {
    const status = this._getStatus()
    const job = status[jobId]
    return job ? job.status : 'process'
  }

  private _onJobCompletion(job, receipt) {
    console.log(`job ${job.id} completed`)
    const status = this._getStatus()
    if (receipt.status == false) {
      status[job.id].status = 'reverted'
      this._writeStatusToFile(status)
      throw new Error(`reverted: ${JSON.stringify(receipt, null, 2)}`)
    }
    if (job.type == 'deploy') {
      status[job.id].address = receipt.contractAddress
    } else if (job.type == 'transaction') {
      // status[job.id].events = receipt.events
    } else {
      throw new Error('job type not recognized')
    }
    status[job.id].status = 'complete'
    this._writeStatusToFile(status)
  }

  async handleEnd(msg) {
    console.log('finished, closing connection now ...')
    this.queue.channel.ack(msg)
    await Worker.delay(2) // if closed too soon, msg doesnt get acked
    this.queue.channel.close()
    process.exit(0)
  }

  async handleTransaction(job) {
    const artifact = this._getArtifact(job.contract)
    // To make it possible to use abi and address from different truffle artifacts
    const address = this._getAddressForContract(job.addressArtifact || job.contract)
    console.log('job.contract', job.contract, 'address', address)
    const txHash = await this.web3Client.transaction(artifact.abi, address, job.method, this._processArgs(job.args))
    const status = this._getStatus()
    status[job.id] = { ...job, txHash, status: 'progress'}
    console.log(status)
    this._writeStatusToFile(status)
  }

  async handleDeploy(job) {
    const artifact = this._getArtifact(job.contract)
    artifact.bytecode = this.linkBytecode(artifact.bytecode)
    if (!Worker.validateBytecode(artifact.bytecode)) {
      console.log('Invalid bytecode for', job.contract)
      throw new Error('Invalid bytecode')
    }

    job.args = this._processArgs(job.args)
    const txHash = await this.web3Client.deploy(artifact.abi, artifact.bytecode, job.args)
    console.log('txHash for', job, 'is', txHash)
    const status = this._getStatus()
    status[job.id] = { ...job, txHash, status: 'progress'}
    console.log(status)
    this._writeStatusToFile(status)
  }

  async waitForConfirmation(jobId) {
    const status = this._getStatus()
    const job = status[jobId]
    const txHash = job.txHash
    console.log('waiting for job', job, 'to get confirmed')
    while (true) {
      if (await this.web3Client.isConfirmed(txHash, this.blockConfirmation)) {
        console.log(txHash, 'confirmed')
        const receipt = await this.web3Client.web3.eth.getTransactionReceipt(txHash)
        // on görli, retrieving the receipt too soon returns null sometimes
        if (receipt != null) return receipt
      }
      await Worker.delay(5) // something like blockConfirmation * blockTime
    }
  }

  private _getStatus() {
    let status = {}
    const statusFile = `${this.buildFolder}/status.json`
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
    const statusFile = `${this.buildFolder}/status.json`
    fs.writeFileSync(statusFile, JSON.stringify(status, null, 2)) // Indent 2 spaces
  }

  private _getArtifact(contract) {
    return JSON.parse(fs.readFileSync(`${this.artifactsDir}/${contract}.json`).toString())
  }

  static delay(s: number) {
    console.log('sleeping for', s, 'secs...')
    return new Promise( resolve => setTimeout(resolve, s * 1000) );
  }

  static validateBytecode(bytecode) {
    var regex = RegExp('0[xX][0-9a-fA-F]+')
    return regex.test(bytecode)
  }

  linkBytecode(bytecode) {
    let index = bytecode.indexOf('__')
    while(index > -1) {
      let lib = bytecode.slice(index, index + 40).slice(2)
      lib = lib.slice(0, lib.indexOf('_'))
      const libAddress = this._getAddressForContract(lib)
      console.log('replacing', lib, 'with', libAddress)
      bytecode = bytecode.replace(`__${lib}` + '_'.repeat(40 - (lib.length + 2)), libAddress.slice(2))
      index = bytecode.indexOf('__')
    }
    return bytecode
  }

  private _getAddressForContract(contract) {
    const status = this._getStatus()
    for (let i = 0; i < Object.keys(status).length; i++) {
      if (status[i].contract === contract) return status[i].address
    }
    throw new Error(`${contract} not found in status file`)
  }

  private _processArgs(args) {
    // console.log('args', args)
    return args.map(arg => {
      return (arg.value || this._getAddressForContract(arg))
    })
  }
}

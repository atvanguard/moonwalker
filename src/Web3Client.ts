import Web3 from 'web3'

export default class Web3Client {
  private web3: Web3
  private options: Object

  constructor(provider, options) {
    this.web3 = new Web3(provider)
    this.options = options
  }

  deploy(abi, bytecode, args): Promise<string> {
    return new Promise((resolve, reject) => {
      const contract = new this.web3.eth.Contract(abi)
      contract.deploy({
        data: bytecode,
        arguments: args
      })
      .send(this.options)
      .on('transactionHash', (transactionHash) => {
        resolve(transactionHash)
      })
      .catch(reject)
    })
  }

  async isConfirmed(txHash: string) {
    const tx = await this.web3.eth.getTransaction(txHash)
    // console.log('tx', tx)
    if (!tx.blockNumber) {
      console.log(`${txHash} is still pending`)
      return { status: false }
    }
    const block = await this.web3.eth.getBlock('latest')

    if (block.number - tx.blockNumber >= 6) {
      return { status: true, receipt: await this.web3.eth.getTransactionReceipt(txHash) }
    } else {
      console.log(`current block is at ${block.number} while tx was in ${tx.blockNumber}`)
      return { status: false }
    }
  }
}

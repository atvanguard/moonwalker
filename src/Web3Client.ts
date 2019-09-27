import Web3 from 'web3'

export default class Web3Client {
  public web3: Web3
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

  transaction(abi, address, method, args) {
    return new Promise((resolve, reject) => {
      const contract = new this.web3.eth.Contract(abi, address)
      contract.methods[method](...args)
      .send(this.options)
      .on('transactionHash', (transactionHash) => {
        resolve(transactionHash)
      })
      .catch(reject)
    })
  }

  async isConfirmed(txHash: string, blocks) {
    const tx = await this.web3.eth.getTransaction(txHash)
    // console.log('tx', tx)
    if (!tx.blockNumber) {
      console.log(`${txHash} is still pending`)
      return false
    }
    const block = await this.web3.eth.getBlock('latest')

    if (block.number - tx.blockNumber >= blocks) {
      return true
    } else {
      console.log(`current block is at ${block.number} while tx was in ${tx.blockNumber}`)
      return false
    }
  }
}

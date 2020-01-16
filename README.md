# Moonwalker

Moonwalker is a utility for sending transactions to the ethereum network in a robust manner. It currently **just** supports deploying truffle artifacts.

Following are some of the features:
- Waits for pending transactions indefintely, if the requirement is to send transactions in a sequential manner.
- If the worker crashes, it is trivial to restart the worker and deployment will continue from the current state.
- Writes transactions hashes, deployed contract addressed to file.
- Possible to parallelize deployment tasks.

### How it works
1. Moonwalker requires a rabbitMq to send to and process (deployment) tasks from.
2. The [Sender](./src/Sender.ts) is used to queue the tasks.
3. The [Worker](./src/Worker.ts) listens to the queue, processes the truffle artifact and sends transactions.

For specific instructions to use Moonwalker, please refer to the Matic Network contracts deployment [notes](https://github.com/maticnetwork/contracts/tree/release-betaV2/moonwalker-migrations).

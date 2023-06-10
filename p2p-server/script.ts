import { bytesToInt, intToBytes, randomBytes } from './src/bytes'
import { Block, BlockHeader } from '@ethereumjs/block'
import { Chain, Common, Hardfork } from '@ethereumjs/common'
import { RLP } from '@ethereumjs/rlp'
import { TransactionFactory, TypedTransaction } from '@ethereumjs/tx'
import chalk from 'chalk'
import * as devp2p from './dev2p_src/index'
import { ETH, Peer } from './dev2p_src/index'
import type LRUCache from 'lru-cache'

const LRU = require('lru-cache')
const ms = require('ms')

import { bytesToHex, hexToBytes } from 'ethereum-cryptography/utils'

const PRIVATE_KEY = randomBytes(32)
const common = new Common({ chain: Chain.Mainnet, hardfork: Hardfork.Shanghai })
const bootstrapNodes = common.bootstrapNodes()
const BOOTNODES = bootstrapNodes.map((node: any) => {
  return {
    address: node.ip,
    udpPort: node.port,
    tcpPort: node.port,
  }
})
const REMOTE_CLIENTID_FILTER = [
  'go1.5',
  'go1.6',
  'go1.7',
  'quorum',
  'pirl',
  'ubiq',
  'gmc',
  'gwhale',
  'prichain',
]

const CHECK_BLOCK_TITLE = 'Shanghai Fork' // Only for debugging/console output
const CHECK_BLOCK_NR = 17034870
const CHECK_BLOCK = 'e22c56f211f03baadcc91e4eb9a24344e6848c5df4473988f893b58223f5216c'
const getPeerAddr = (peer: Peer) => `${peer._socket.remoteAddress}:${peer._socket.remotePort}`

const FIRST_START_BLOCK = 17448896

// DPT
//@ts-ignore
const dpt = new devp2p.DPT(PRIVATE_KEY, {
  refreshInterval: 30000,
  endpoint: {
    address: '0.0.0.0',
    udpPort: null,
    tcpPort: null,
  },
})

/* eslint-disable no-console */
dpt.on('error', (err) => console.error(chalk.red(`DPT error: ${err}`)))

/* eslint-disable @typescript-eslint/no-use-before-define */

// RLPx
//@ts-ignore
const rlpx = new devp2p.RLPx(PRIVATE_KEY, {
  dpt,
  maxPeers: 100,
  capabilities: [devp2p.ETH.eth66],
  common,
  remoteClientIdFilter: REMOTE_CLIENTID_FILTER,
})

rlpx.on('error', (err) => console.error(chalk.red(`RLPx error: ${err.stack ?? err}`)))

const blockNrs: {[key: string]: bigint} = {}
const getGlobalMedianBlock = () => {
  if(Object.keys(blockNrs).length === 0) return FIRST_START_BLOCK

  const values = Object.values(blockNrs);
  const numbers = values.map((value) => Number(value))
  const sortedNumbers = numbers.slice().sort((a, b) => a - b);
  const middleIndex = Math.floor(sortedNumbers.length / 2);
  console.log('numbers ', numbers)

  if (sortedNumbers.length % 2 === 0) {
    const value1 = sortedNumbers[middleIndex - 1];
    const value2 = sortedNumbers[middleIndex];
    return Math.floor((value1 + value2) / 2);
  } else {
    return sortedNumbers[middleIndex];
  }
}
let globalLatestBlockNumber = getGlobalMedianBlock()

rlpx.on('peer:added', (peer) => {
  const addr = getPeerAddr(peer)
  const eth = peer.getProtocols()[0]
  const clientId: string = peer.getHelloMessage().clientId.toString()

  blockNrs[clientId] = BigInt(globalLatestBlockNumber)

  console.log(
    chalk.green(
      `Add peer: ${addr} ${clientId} (eth${eth.getVersion()}) (total: ${rlpx.getPeers().length})`
    )
  )

  eth.sendStatus({
    td: intToBytes(17179869184), // total difficulty in genesis block
    bestHash: hexToBytes('d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3'),
    genesisHash: hexToBytes('d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3'),
  })

  // check CHECK_BLOCK
  let forkDrop: NodeJS.Timeout
  let forkVerified = false
  eth.once('status', () => {
    // start with requesting first shangai block
    eth.sendMessage(devp2p.ETH.MESSAGE_CODES.GET_BLOCK_HEADERS, [
      Uint8Array.from([1]),
      [intToBytes(CHECK_BLOCK_NR), Uint8Array.from([1]), Uint8Array.from([]), Uint8Array.from([])],
    ])
    // setup timeout if no shangai block is returned after a while
    forkDrop = setTimeout(() => {
      peer.disconnect(devp2p.DISCONNECT_REASONS.USELESS_PEER)
    }, ms('15s'))
    peer.once('close', () => clearTimeout(forkDrop))
  })

  eth.on('message', async (code: ETH.MESSAGE_CODES, payload: any) => {
    switch (code) {
      case devp2p.ETH.MESSAGE_CODES.BLOCK_HEADERS: {
        if (!forkVerified) {
          if (payload[1].length !== 1) {
            console.log(
              `${addr} expected one header for ${CHECK_BLOCK_TITLE} verify (received: ${payload[1].length})`
            )
            peer.disconnect(devp2p.DISCONNECT_REASONS.USELESS_PEER)
            break
          }
          const header = BlockHeader.fromValuesArray(payload[1][0], { common })
          const expectedHash = CHECK_BLOCK
          if (bytesToHex(header.hash()) === expectedHash) {
            console.log(`${addr} verified to be on the same side of the ${CHECK_BLOCK_TITLE}`)
            clearTimeout(forkDrop)
            forkVerified = true
          }
          setTimeout(() => {
            eth.sendMessage(devp2p.ETH.MESSAGE_CODES.GET_BLOCK_HEADERS, [
              Uint8Array.from([1]),
              [intToBytes(Number(FIRST_START_BLOCK)), Uint8Array.from([1]), Uint8Array.from([]), Uint8Array.from([])],
            ])
          }, ms('0.5s'))

        } else {
          if (payload[1].length > 1) {
            console.log(
              `${addr} not more than one block header expected (received: ${payload[1].length})`
            )
            break
          }

          const latestBlockNr = blockNrs[clientId] || FIRST_START_BLOCK

          // we received empty header data, probably block number is too far in the future
          // lets try again a bit later
          if (payload[1][0] === undefined) {
            setTimeout(() => {
              eth.sendMessage(devp2p.ETH.MESSAGE_CODES.GET_BLOCK_HEADERS, [
                Uint8Array.from([1]),
                [intToBytes(Number(latestBlockNr)), Uint8Array.from([1]), Uint8Array.from([]), Uint8Array.from([])],
              ])
            }, ms('0.5s'))

            break
          }

          const header = BlockHeader.fromValuesArray(payload[1][0], { common })

          if(latestBlockNr < header.number) {
            blockNrs[clientId] = header.number
          }
          if(globalLatestBlockNumber < getGlobalMedianBlock()) {
            globalLatestBlockNumber = getGlobalMedianBlock()
          }

          setTimeout(() => {
            eth.sendMessage(devp2p.ETH.MESSAGE_CODES.GET_BLOCK_HEADERS, [
              Uint8Array.from([1]),
              [intToBytes(Number(header.number) + 1), Uint8Array.from([1]), Uint8Array.from([]), Uint8Array.from([])],
            ])
          }, ms('0.5s'))

          console.log(
            `Received new HEADER from ${clientId}, current latest peer block: ${blockNrs[clientId]}, global latest block: ${getGlobalMedianBlock()}`
          )
        }

        break
      }
    }
  })
})

rlpx.on('peer:removed', (peer, reasonCode, disconnectWe) => {
  const who = disconnectWe === true ? 'we disconnect' : 'peer disconnect'
  const total = rlpx.getPeers().length

  const clientId: string = peer.getHelloMessage().clientId.toString()
  delete blockNrs[clientId]

  console.log(
    chalk.yellow(
      `Remove peer: ${getPeerAddr(peer)} - ${who}, reason: ${peer.getDisconnectPrefix(
        reasonCode
      )} (${String(reasonCode)}) (total: ${total})`
    )
  )
})

rlpx.on('peer:error', (peer, err) => {
  console.log('xxxxxxxxxxxxxx PEEEERS :', blockNrs)

  if (err.code === 'ECONNRESET') return

  if (err instanceof Error) {
    const peerId = peer.getId()
    if (peerId !== null) dpt.banPeer(peerId, ms('5m'))

    console.error(chalk.red(`Peer error (${getPeerAddr(peer)}): ${err.message}`))
    return
  }

  console.error(chalk.red(`Peer error (${getPeerAddr(peer)}): ${err.stack ?? err}`))
})

// uncomment, if you want accept incoming connections
// rlpx.listen(30303, '0.0.0.0')
// dpt.bind(30303, '0.0.0.0')


const customBootNodes = [
  { address: '18.138.108.67', udpPort: 30303, tcpPort: 30303 },
  { address: '3.209.45.79', udpPort: 30303, tcpPort: 30303 },
  { address: '52.187.207.27', udpPort: 30303, tcpPort: 30303 },
  { address: '191.234.162.198', udpPort: 30303, tcpPort: 30303 },
  { address: '52.231.165.108', udpPort: 30303, tcpPort: 30303 },
  { address: '104.42.217.25', udpPort: 30303, tcpPort: 30303 },
  { address: '65.108.70.101', udpPort: 30303, tcpPort: 30303 },
  { address: '157.90.35.166', udpPort: 30303, tcpPort: 30303 },
]
for (const bootnode of customBootNodes) {
  dpt.bootstrap(bootnode).catch((err) => {
    console.error(chalk.bold.red(`DPT bootstrap error: ${err.stack ?? err}`))
  })
}

// connect to local ethereum node (debug)
/*
dpt.addPeer({ address: '127.0.0.1', udpPort: 30303, tcpPort: 30303 })
  .then((peer) => {
    return rlpx.connect({
      id: peer.id,
      address: peer.address,
      tcpPort: peer.tcpPort,
      udpPort: peer.tcpPort
    })
  })
  .catch((err) => console.log(`error on connection to local node: ${err.stack ?? err}`))
*/

const txCache: LRUCache<string, boolean> = new LRU({ max: 1000 })
function onNewTx(tx: TypedTransaction, peer: Peer) {
  const txHashHex = bytesToHex(tx.hash())
  if (txCache.has(txHashHex)) return

  txCache.set(txHashHex, true)
  console.log(`New tx: ${txHashHex} (from ${getPeerAddr(peer)})`)
}

const blocksCache: LRUCache<string, boolean> = new LRU({ max: 100 })
function onNewBlock(block: Block, peer: Peer) {
  const blockHashHex = bytesToHex(block.hash())
  const blockNumber = block.header.number
  if (blocksCache.has(blockHashHex)) return

  blocksCache.set(blockHashHex, true)
  console.log()
  console.log(`New block ${blockNumber}: ${blockHashHex} (from ${getPeerAddr(peer)})`)
  console.log('-'.repeat(105))
  for (const tx of block.transactions) onNewTx(tx, peer)
}

function isValidTx(tx: TypedTransaction) {
  return tx.validate()
}

async function isValidBlock(block: Block) {
  return (
    block.validateUnclesHash() &&
    block.transactions.every(isValidTx) &&
    block.validateTransactionsTrie()
  )
}

setInterval(() => {
  const peersCount = dpt.getPeers().length
  const openSlots = rlpx._getOpenSlots()
  const queueLength = rlpx._peersQueue.length
  const queueLength2 = rlpx._peersQueue.filter((o) => o.ts <= Date.now()).length

  console.log(
    chalk.yellow(
      `Total nodes in DPT: ${peersCount}, open slots: ${openSlots}, queue: ${queueLength} / ${queueLength2}`
    )
  )
}, ms('30s'))





/////// REST SERVER

import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

// Example endpoint for GET request
app.get('/api/mainnet/latestBlock', (req: Request, res: Response) => {
  res.json(globalLatestBlockNumber);
});

// Example endpoint for POST request
// app.post('/api/users', (req: Request, res: Response) => {
//   const { name } = req.body;
//   // Assuming name is provided in the request body
//   // Here you can handle the logic to create a new user
//   const newUser = { id: 1, name };
//   res.json(newUser);
// });

const port = 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});




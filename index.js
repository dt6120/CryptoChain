const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const Blockchain = require('./blockchain/index');
const TransactionPool = require('./wallet/transaction-pool');
const Wallet = require('./wallet/index');
const PubSub = require('./app/pubsub');
const TransactionMiner = require('./app/transaction-miner');

const app = express();
const blockchain = new Blockchain();
const transactionPool = new TransactionPool();
const wallet = new Wallet();
const pubsub = new PubSub({ blockchain, transactionPool });
const transactionMiner = new TransactionMiner({ blockchain, transactionPool, wallet, pubsub });

const DEFAULT_PORT = 3000;
const ROOT_NODE_ADDRESS = `http://127.0.0.1:${DEFAULT_PORT}`;

// setTimeout(() => pubsub.broadcastChain(), 1000);

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.get('/api/blocks', (req, res) => {
    res.json(blockchain.chain);
});

app.get('/api/block/:id', (req, res) => {
    res.json(blockchain.chain[req.params.id - 1]);
});

app.post('/api/mine', (req, res) => {
    const { data } = req.body;

    blockchain.addBlock({ data });

    pubsub.broadcastChain();

    res.redirect('/api/blocks');
});

app.post('/api/transact', (req, res) => {
    const { recipient, amount } = req.body;
    let transaction = transactionPool.existingTransaction({ inputAddress: wallet.publicKey });
    
    try {
        if (transaction) {
            transaction.update({ senderWallet: wallet, recipient, amount });
        } else {
            transaction = wallet.createTransaction({
                recipient,
                amount,
                chain: blockchain.chain
            });
        }
    } catch (err) {
        return res.status(400).json({ type: 'error', message: err.message });
    }

    transactionPool.setTransaction(transaction);

    res.json({ transaction });
});

app.get('/api/transaction-pool-map', (req, res) => {
    res.json(transactionPool.transactionMap);
});

app.get('./api/mine-transactions', (req, res) => {
    transactionMiner.mineTransaction();

    res.redirect('/api/blocks');
});

app.get('/api/wallet-info', (req, res) => {
    const address = wallet.publicKey;

    res.json({
        address,
        balance: wallet.calculateBalance({ chain: blockchain.chain, address })
    });
});

const syncWithRootState = () => {
    request({ url: `${ROOT_NODE_ADDRESS}/api/blocks` }, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            const rootChain = JSON.parse(body);

            console.log('replace chain on a sync with ROOT_CHAIN');
            blockchain.replaceChain(root);
        }
    });

    request({ url: `${ROOT_NODE_ADDRESS}/api/transaction-pool-map` }, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            const rootTransactionPoolMap = JSON.parse(body);

            console.log('replace transaction pool map on a sync with ROOT_CHAIN');
            transactionPool.setMap(rootTransactionPoolMap);
        }
    });
};

let PEER_PORT;

if (process.env.GENERATE_PEER_PORT === 'true') {
    PEER_PORT = DEFAULT_PORT + Math.ceil(Math.random() * 1000);
}

const PORT = PEER_PORT || DEFAULT_PORT;
app.listen(PORT, () => {
    console.log(`Listening to port ${PORT}...`);

    if (PORT !== DEFAULT_PORT) {
        syncWithRootState();
    }
});

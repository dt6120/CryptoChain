const uuid = require('uuid/dist/v1');
const { verifySignature } = require('../util/index')

class Transaction {
    constructor({ senderWallet, recipient, amount }) {
        this.id = uuid;
        this.outputMap = this.createOutputMap({ senderWallet, recipient, amount });
        this.input = this.createInput({ senderWallet, outputMap: this.outputMap });
    }

    createOutputMap({ senderWallet, recipient, amount }) {
        const outputMap = {};

        outputMap[senderWallet.publicKey] = senderWallet.balance - amount;
        
        if (outputMap[recipient] === undefined) {
            outputMap[recipient] = amount;
        }
        else {
            outputMap[recipient] += amount;
        }

        return outputMap;
    }

    createInput({ senderWallet, outputMap }) {
        return {
            timestamp: Date.now(),
            address: senderWallet.publicKey,
            amount: senderWallet.balance,
            signature: senderWallet.sign(outputMap)
        };
    }

    update({ senderWallet, recipient, amount }) {
        if (amount > this.outputMap[senderWallet.publicKey]) {
            throw new Error('Amount exceeds balance');
        }
        if (this.outputMap[recipient] === undefined) {
            this.outputMap[recipient] = amount;
        }
        else {
            this.outputMap[recipient] += amount;
        }

        this.outputMap[senderWallet.publicKey] -= amount;

        this.input = this.createInput({ senderWallet, outputMap: this.outputMap });
    }

    static validTransaction(transaction) {
        const {input: { address, amount, signature }, outputMap} = transaction;

        const outputTotal = Object.values(outputMap)
            .reduce((total, outputAmount) => total + outputAmount);
        
        if (amount !== outputTotal) {
            console.error(`Invalid transaction from ${address}`);
            return false;
        }

        if (!verifySignature({ publicKey: address, data: outputMap, signature })) {
            console.error(`Invalid transaction from ${address}`);
            return false;
        }

        return true;
    }
}

module.exports = Transaction;

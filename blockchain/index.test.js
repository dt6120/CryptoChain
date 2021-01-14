const Blockchain = require('./index');
const Block = require('./block');
const { cryptoHash } = require('../util/index');
const Wallet = require('../wallet/index');
const Transaction = require('../wallet/transaction');

describe('Blockchain', () => {
    let blockchain, newChain, originalChain, errorMock;

    beforeEach(() => {
        blockchain = new Blockchain();
        newChain = new Blockchain();

        originalChain = blockchain.chain;

        errorMock = jest.fn();
        global.console.error = errorMock;
    });

    it('contains a `chain` array instance', () => {
        expect(blockchain.chain instanceof Array).toBe(true);
    });

    it('starts with a genesis block', () => {
        expect(blockchain.chain[0]).toEqual(Block.genesis());
    });

    it('adds a new block', () => {
        const data = 'data-for-new-block';
        blockchain.addBlock({ data });

        expect(blockchain.chain[blockchain.chain.length - 1].data).toEqual(data);
    });

    describe('isValidChain()', () => {
        describe('when the chain does not start with genesis block', () => {
            it('returns false', () => {
                blockchain.chain[0] = { data: 'fake-genesis' };

                expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
            });
        });

        describe('when the chain starts with genesis block and has multiple blocks', () => {
            beforeEach(() => {
                blockchain.addBlock({ data: 'Bears' });
                blockchain.addBlock({ data: 'Beets' });
                blockchain.addBlock({ data: 'BattleStarGalactica' });
            });

            describe('and a last hash reference has changed', () => {
                it('returns false', () => {
                    blockchain.chain[2].lastHash = 'broken-lastHash';

                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe('and the chain contains a block with an invald field', () => {
                it('returns false', () => {
                    blockchain.chain[2].data = 'some-bad-and-evil-data';

                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe('and the chain contains a block with jumped difficulty', () => {
                it('returns false', () => {
                    const lastBlock = blockchain.chain[blockchain.chain.length - 1];
                    const lastHash = lastBlock.hash;
                    const timestamp = Date.now();
                    const nonce = 0;
                    const data = [];
                    const difficulty = lastBlock.difficulty - 3;
                    const hash = cryptoHash(timestamp, lastHash, difficulty, nonce, data);
                    const badBlock = new Block({
                        timestamp, lastHash, nonce, difficulty, hash, data
                    });
                    blockchain.chain.push(badBlock);

                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe('and the chain does not contain any invalid blocks', () => {
                it('returns true', () => {
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
                });
            });
        });
    });

    describe('replaceChain()', () => {
        let logMock;

        beforeEach(() => {
            logMock = jest.fn();
            
            global.console.log = logMock;
        });

        describe('when the new chain in not longer', () => {
            beforeEach(() => {
                newChain.chain[0] = { new: 'chain' };
                blockchain.replaceChain(newChain.chain);
            });

            it('does not replace the chain', () => {
                expect(blockchain.chain).toEqual(originalChain);
            });

            it('logs an error', () => {
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe('when the new chain is longer', () => {
            beforeEach(() => {
                newChain.addBlock({ data: 'Bears' });
                newChain.addBlock({ data: 'Beets' });
                newChain.addBlock({ data: 'BattleStarGalactica' });
            });

            describe('and the chain is invalid', () => {
                beforeEach(() => {
                    newChain.chain[2].hash = 'fake-hash';
                    blockchain.replaceChain(newChain.chain);
                });

                it('does not replace the chain', () => {
                    expect(blockchain.chain).toEqual(originalChain);
                });

                it('logs an error', () => {
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('and the chain is valid', () => {
                beforeEach(() => {
                    blockchain.replaceChain(newChain.chain);
                });

                it('replaces the chain', () => {
                    expect(blockchain.chain).toEqual(newChain.chain);
                });

                it('logs about the replacement', () => {
                    expect(logMock).toHaveBeenCalled();
                });
            });
        });

        describe('and the `validateTransactions` flag is true', () => {
            it('calls validTransactionData()', () => {
                const validTransactionDataMock = jest.fn();

                blockchain.validTransactionData = validTransactionDataMock;

                newChain.addBlock({ data: 'test-data' });
                blockchain.replaceChain(newChain.chain, true);

                expect(validTransactionDataMock).toHaveBeenCalled();
            });
        });
    });

    describe('validTransactionData()', () => {
        let transaction, rewardTransaction, wallet;

        beforeEach(() => {
            wallet = new Wallet();
            transaction = wallet.createTransaction({ recipient: 'test-recipient', amount: 100 });
            rewardTransaction = Transaction.rewardTransaction({ minerWallet: wallet });
        });

        describe('and the transaction data is valid', () => {
            it('returns true', () => {
                newChain.addBlock({ data: [ transaction, rewardTransaction ] });

                expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(true);
                expect(errorMock).not.toHaveBeenCalled();
            });
        });

        describe('and the transaction data has multiple rewards', () => {
            it('returns false and logs an error', () => {
                newChain.addBlock({ data: [transaction, rewardTransaction, rewardTransaction] });

                expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe('and the transaction data has atleast one malformed outputMap', () => {
            describe('and the transaction is not a reward transaction', () => {
                it('returns false and logs an error', () => {
                    transaction.outputMap[wallet.publicKey] = 9999;

                    newChain.addBlock({ data: [transaction, rewardTransaction] });

                    expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('and the transaction is a reward transaction', () => {
                it('returns false and logs an error', () => {
                    rewardTransaction.outputMap[wallet.publicKey] = 9999;

                    newChain.addBlock({ data: [transaction, rewardTransaction] });

                    expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            })
        });

        describe('and the transaction data has at least one malformed input', () => {
            it('returns false and logs an error', () => {
                wallet.balance = 9000;

                const badOutputMap = {
                    [wallet.publicKey]: 8900,
                    'test-rceipient': 100
                };

                const badInput = {
                    timestamp: Date.now(),
                    amount: wallet.balance,
                    address: wallet.publicKey,
                    signature: wallet.sign(badOutputMap)
                };

                const badTransaction = {
                    input: badInput,
                    outputMap: badOutputMap
                };

                newChain.addBlock({ data: [badTransaction, rewardTransaction] });
                expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe('and a block contains multiple identical transactions', () => {
            it('returns false and logs an error', () => {
                newChain.addBlock({ data: [transaction, transaction, rewardTransaction] });

                expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });
    });
});
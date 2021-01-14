const Wallet = require('./index');
const { verifySignature } = require('../util/index');
const Transaction = require('./transaction');
const Blockchain = require('../blockchain/index');
const { STARTING_BALANCE } = require('../config');

describe('Wallet', () => {
    let wallet;

    beforeEach(() => {
        wallet = new Wallet();
    });

    it('has a `balance`', () => {
        expect(wallet).toHaveProperty('balance');
    });

    it('hash a `publicKey`', () => {
        expect(wallet).toHaveProperty('publicKey');
    });

    describe('signing data', () => {
        const data = 'test-data';

        it('verifies a signature', () => {
            expect(
                verifySignature({
                    publicKey: wallet.publicKey,
                    data,
                    signature: wallet.sign(data)
                })
            ).toBe(true);
        });

        it('does not verify an invalid signature', () => {
            expect(
                verifySignature({
                    publicKey: wallet.publicKey,
                    data,
                    signature: (new Wallet).sign(data)
                })
            ).toBe(false);
        });
    });;

    describe('createTransaction()', () => {
        describe('and the amount exceeds the balance', () => {
            it('throws an error', () => {
                expect(() => wallet.createTransaction({ recipient: 'test-recipient', amount: 1001 }))
                    .toThrow('Amount exceeds balance');
            });
        });

        describe('and the amount is valid', () => {
            let transaction, recipient, amount;

            beforeEach(() => {
                recipient = 'test-recipient';
                amount = 50;
                transaction = wallet.createTransaction({ recipient, amount });
            });

            it('creates an instance of `Transaction`', () => {
                expect(transaction instanceof Transaction).toBe(true);
            });

            it('matches the transaction input with the wallet', () => {
                expect(transaction.input.address).toEqual(wallet.publicKey);
            });

            it('outputs the amount to the recipient', () => {
                expect(transaction.outputMap[recipient]).toEqual(amount);
            });
        });

        describe('and a chain is passed', () => {
            it('calls `Wallet.calculateBalance`', () => {
                const calculateBalanceMock = jest.fn();
                
                const originalCalculateBalance = Wallet.calculateBalance;
                Wallet.calculateBalance = calculateBalanceMock;

                wallet.createTransaction({
                    recipient: 'new-recipient',
                    amount: 200,
                    chain: new Blockchain().chain
                });

                expect(calculateBalanceMock).toHaveBeenCalled();

                Wallet.calculateBalance = originalCalculateBalance;
            });
        });
    });

    describe('calculateBalance()', () => {
        let blockchain;

        beforeEach(() => {
            blockchain = new Blockchain();
        });

        describe('and there are no outputs for the wallet', () => {
            it('returns the `STARTING BALANCE`', () => {
                expect(
                    Wallet.calculateBalance({
                        chain: blockchain.chain,
                        address: wallet.publicKey
                    })
                ).toEqual(STARTING_BALANCE);
            });
        });

        describe('and there are outputs for the wallet', () => {
            let transaction_one, transaction_two;

            beforeEach(() => {
                transaction_one = new Wallet().createTransaction({
                    recipient: wallet.publicKey,
                    amount: 250
                });
                transaction_two = new Wallet().createTransaction({
                    recipient: wallet.publicKey,
                    amount: 150
                });

                blockchain.addBlock({ data: [transaction_one, transaction_two] });
            });

            it('adds the sum of all the outputs to the wallet balance', () => {
                expect(
                    Wallet.calculateBalance({
                        chain: blockchain.chain,
                        address: wallet.publicKey
                    })
                ).toEqual(
                    STARTING_BALANCE + 
                    transaction_one.outputMap[wallet.publicKey] + 
                    transaction_two.outputMap[wallet.publicKey]
                );
            });

            describe('and the wallet has made a transaction', () => {
                let recentTransaction;

                beforeEach(() => {
                    recentTransaction = wallet.createTransaction({
                        recipient: 'test-recipient',
                        amount: 250
                    });

                    blockchain.addBlock({ data: [recentTransaction] });
                });

                it('returns the output amount of the recent transaction', () => {
                    expect(
                        Wallet.calculateBalance({
                            chain: blockchain.chain,
                            address: wallet.publicKey
                        })
                    ).toEqual(recentTransaction.outputMap[wallet.publicKey]);
                });

                describe('and there are outputs next to and after the recent transaction', () => {
                    let sameBlockTransaction, nextBlockTransaction;

                    beforeEach(() => {
                        recentTransaction = wallet.createTransaction({
                            recipient: 'new-recipient',
                            amount: 100
                        });

                        sameBlockTransaction = Transaction.rewardTransaction({ minerWallet: wallet });

                        blockchain.addBlock({ data: [recentTransaction, sameBlockTransaction] });

                        nextBlockTransaction = new Wallet().createTransaction({
                            recipient: wallet.publicKey,
                            amount: 200
                        });

                        blockchain.addBlock({ data: [nextBlockTransaction] });
                    });

                    it('includes the output amounts in the returned balance', () => {
                        expect(
                            Wallet.calculateBalance({
                                chain: blockchain.chain,
                                address: wallet.publicKey
                            })
                        ).toEqual(
                            recentTransaction.outputMap[wallet.publicKey] +
                            sameBlockTransaction.outputMap[wallet.publicKey] +
                            nextBlockTransaction.outputMap[wallet.publicKey]
                        );
                    });
                });
            });
        });
    });
});

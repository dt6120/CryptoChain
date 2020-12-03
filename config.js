const MINE_RATE = 1000;
const INITIAL_DIFFICULTY = 15;

const GENESIS_DATA = {
    timestamp: Date.now(),
    lastHash: '0x0',
    hash: 'hash-genesis',
    data: [],
    difficulty: INITIAL_DIFFICULTY,
    nonce: 0
};

const STARTING_BALANCE = 1000;

module.exports = { GENESIS_DATA, MINE_RATE, STARTING_BALANCE };

const hexToBinary = require('hex-to-binary');
const { GENESIS_DATA, MINE_RATE } = require('../config');
const { cryptoHash } = require('../util/index');

class Block {
	constructor({ timestamp, nonce, difficulty, lastHash, hash, data }) {
		this.timestamp = timestamp;
		this.nonce = nonce;
		this.difficulty = difficulty;
		this.lastHash = lastHash;
		this.hash = hash;
		this.data = data;
	}

	static genesis() {
		return new this(GENESIS_DATA);
	}

	static mineBlock({ lastBlock, data }) {
		const lastHash = lastBlock.hash;
		let hash, timestamp, difficulty;
		// let { difficulty } = lastBlock;
		let nonce = 0;

		do {
			nonce++;
			timestamp = Date.now();
			difficulty = this.adjustDifficulty({ originalBlock: lastBlock, timestamp });
			hash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);
		} while (hexToBinary(hash).substring(0, difficulty) !== '0'.repeat(difficulty));

		return new this({ timestamp, nonce, difficulty, lastHash, hash, data });
	}

	static adjustDifficulty({ originalBlock, timestamp }) {
		const { difficulty } = originalBlock;

		if (difficulty < 1) {
			return 1;
		}

		if((timestamp - originalBlock.timestamp) > MINE_RATE) {
			return difficulty - 1;
		}

		return difficulty + 1;
	}
}

module.exports = Block;

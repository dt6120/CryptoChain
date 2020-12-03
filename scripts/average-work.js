const Blockchain = require('../blockchain/index');

const blockchain = new Blockchain();

let prevTimestamp, nextTimestamp, nextBlock, timeDiff, average;

const times = [];

for (let i=0; i<10000; i++) {
    prevTimestamp = blockchain.chain[blockchain.chain.length - 1].timestamp;
    
    blockchain.addBlock({ data: `block ${i + 2}` });
    nextBlock = blockchain.chain[blockchain.chain.length - 1];
    
    nextTimestamp = nextBlock.timestamp;
    timeDiff = nextTimestamp - prevTimestamp;
    times.push(timeDiff);

    average = times.reduce((total, num) => (total + num)) / times.length;

    console.log(`Time to mine block: ${timeDiff}ms.\tDifficulty: ${nextBlock.difficulty}.\tAverage time: ${average}ms.`);
}

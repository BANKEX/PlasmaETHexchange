const config = require("../config/config");
const blockPrefix = config.blockPrefix;
const Block = require("../../lib/Block/block");

module.exports = function(levelDB) {
    return async function getBlockByNumber(blockNumber) {
        const blockNumberBuffer = Buffer.alloc(4);
        blockNumberBuffer.writeUInt32BE(blockNumber);
        const key = Buffer.concat([blockPrefix, blockNumberBuffer]);
        const blockBin = await levelDB.get(key);
        const block = new Block(blockBin);
        return block;
    } 
}


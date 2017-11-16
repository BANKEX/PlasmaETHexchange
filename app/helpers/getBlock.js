const config = require("../config/config");
const blockPrefix = config.blockPrefix;
const Block = require("../../lib/Block/block");
const {blockNumberLength,
    txNumberLength,
    txTypeLength, 
    signatureVlength,
    signatureRlength,
    signatureSlength,
    merkleRootLength,
    previousHashLength,
    txOutputNumberLength,
    txAmountLength,
    txToAddressLength} = require('../../lib/dataStructureLengths');
const ethUtil = require('ethereumjs-util');
const BN = ethUtil.BN;

module.exports = function(levelDB) {
    return async function getBlockByNumber(blockNumber) {
        const blockNumberBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(blockNumber)),blockNumberLength)
        const key = Buffer.concat([blockPrefix, blockNumberBuffer]);
        const blockBin = await levelDB.get(key);
        const block = new Block(blockBin);
        return block;
    } 
}


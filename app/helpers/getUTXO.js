const config = require("../config/config");
const blockPrefix = config.blockPrefix;
const utxoPrefix = config.utxoPrefix;
const {TransactionOutput} = require("../../lib/Tx/output");
const {TransactionInput} = require("../../lib/Tx/input");
const {BlockHeader} = require("../../lib/Block/blockHeader");
const ethUtil = require('ethereumjs-util');
const BN = ethUtil.BN;

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

module.exports = function(levelDB) {

    return async function getUTXO(blockNumber, txNumber, outputNumber) {
        const blockNumberBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(blockNumber)),blockNumberLength)
        const txNumberBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(txNumber)),txNumberLength)
        const txOutputNumberBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(outputNumber)),txOutputNumberLength)
        const query = Buffer.concat([utxoPrefix, 
            blockNumberBuffer, 
            txNumberBuffer,
            txOutputNumberBuffer])
        try {
            const data = await levelDB.get(query);
            return TransactionOutput.prototype.initFromBinaryBlob(data);
        }
        catch(err) {
            return null;
        }
    }
}
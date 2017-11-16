const config = require("../config/config");
const blockPrefix = config.blockPrefix;
const utxoPrefix = config.utxoPrefix;
const transactionPrefix = config.transactionPrefix;
const {TransactionOutput} = require("../../lib/Tx/output");
const {TransactionInput} = require("../../lib/Tx/input");
const {PlasmaTransaction, TxLengthForType} = require("../../lib/Tx/tx");
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

    return async function getTX(blockNumber, txNumber) {
        const blockNumberBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(blockNumber)),blockNumberLength)
        const txNumberBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(txNumber)),txNumberLength)
        const query = Buffer.concat([transactionPrefix, 
            blockNumberBuffer, 
            txNumberBuffer])
        try {
            const data = await levelDB.get(query);
            const txType = ethUtil.bufferToInt(data.slice(txNumberLength,txNumberLength+txOutputNumberLength))
            const txBin = data.slice(0, TxLengthForType[txType]);
            const TX = PlasmaTransaction.prototype.initTxForTypeFromBinary(txType, txBin);
            return TX
        }
        catch(err) {
            return null;
        }
    }
}
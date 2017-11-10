const config = require("../config/config");
const blockPrefix = config.blockPrefix;
const utxoPrefix = config.utxoPrefix;
const transactionPrefix = config.transactionPrefix;
const {TransactionOutput} = require("../../lib/Tx/output");
const {TransactionInput} = require("../../lib/Tx/input");
const {PlasmaTransaction, TxLengthForType} = require("../../lib/Tx/tx");
const {BlockHeader} = require("../../lib/Block/blockHeader");

module.exports = function(levelDB) {
    const dummyInput = new TransactionInput();
    const dummyOutput = new TransactionOutput();
    const outputNumInTxLength = dummyOutput.outputNumberInTransaction.length;
    const blockNumberLength = dummyInput.blockNumber.length;
    const txNumberInBlockLength = dummyInput.txNumberInBlock.length;
    const recipientLength = dummyOutput.to.length;

    return async function getTX(blockNumber, txNumber) {
        const blockNumberBuffer = Buffer.alloc(blockNumberLength);
        blockNumberBuffer.writeUInt32BE(blockNumber);
        const txNumberBuffer = Buffer.alloc(txNumberInBlockLength);
        txNumberBuffer.writeUInt16BE(txNumber);
        const query = Buffer.concat([transactionPrefix, 
            blockNumberBuffer, 
            txNumberBuffer])
        try {
            const data = await levelDB.get(query);
            const txType = data.slice(2,3).readUInt8(0);
            const txBin = data.slice(0, TxLengthForType[txType]);
            const TX = PlasmaTransaction.prototype.initTxForTypeFromBinary(txType, txBin);
            return TX
        }
        catch(err) {
            return null;
        }
    }
}
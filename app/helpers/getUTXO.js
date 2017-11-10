const config = require("../config/config");
const blockPrefix = config.blockPrefix;
const utxoPrefix = config.utxoPrefix;
const {TransactionOutput} = require("../../lib/Tx/output");
const {TransactionInput} = require("../../lib/Tx/input");
const {BlockHeader} = require("../../lib/Block/blockHeader");

module.exports = function(levelDB) {
    const dummyInput = new TransactionInput();
    const dummyOutput = new TransactionOutput();
    const outputNumInTxLength = dummyOutput.outputNumberInTransaction.length;
    const blockNumberLength = dummyInput.blockNumber.length;
    const txNumberInBlockLength = dummyInput.txNumberInBlock.length;
    const recipientLength = dummyOutput.to.length;

    return async function getUTXO(blockNumber, txNumber, outputNumber) {
        const blockNumberBuffer = Buffer.alloc(blockNumberLength);
        blockNumberBuffer.writeUInt32BE(blockNumber);
        const txNumberBuffer = Buffer.alloc(txNumberInBlockLength);
        txNumberBuffer.writeUInt16BE(txNumber);
        const outputNumberBuffer = Buffer.alloc(outputNumInTxLength);
        outputNumberBuffer.writeUInt8(outputNumber);
        const query = Buffer.concat([utxoPrefix, 
            blockNumberBuffer, 
            txNumberBuffer,
            outputNumberBuffer])
        try {
            const data = await levelDB.get(query);
            return TransactionOutput.prototype.initFromBinaryBlob(data);
        }
        catch(err) {
            return null;
        }
    }
}
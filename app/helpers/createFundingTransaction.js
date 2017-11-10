const config = require("../config/config");
const ethUtil = require('ethereumjs-util'); 
const plasmaOperatorPrivKeyHex = config.plasmaOperatorPrivKeyHex;
const plasmaOperatorPrivKey = ethUtil.toBuffer(plasmaOperatorPrivKeyHex);
const {PlasmaTransaction,
    TxTypeFund, 
    TxTypeMerge, 
    TxTypeSplit, 
    TxTypeWithdraw, 
    TxLengthForTypes} = require("../../lib/Tx/tx");

const {TransactionInput, TransactionInputLength} = require("../../lib/Tx/input");
const {TransactionOutput, TransactionOutputLength} = require("../../lib/Tx/output");
const dummyInput = new TransactionInput();
const dummyOutput = new TransactionOutput();
const outputNumInTxLength = dummyOutput.outputNumberInTransaction.length;
const blockNumberLength = dummyInput.blockNumber.length;
const txNumberInBlockLength = dummyInput.txNumberInBlock.length;
const recipientLength = dummyOutput.to.length;
const valueBufferLength = dummyOutput.valueBuffer.length;

module.exports = function createFundingTransaction(toAddressString, amountBN, depositIndexBN) {
    const amountBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(amountBN),valueBufferLength)
    const inputParams = {
        blockNumber: '0x' + '00'.repeat(blockNumberLength),
        txNumberInBlock: '0x' +'00'.repeat(txNumberInBlockLength),
        // assetID: ethUtil.setLengthLeft(ethUtil.bufferToHex(ethUtil.toBuffer(asset)), 4),
        outputNumberInTransaction: '0x01',
        amountBuffer
    }
    const input = new TransactionInput(inputParams);
    const outputParams = {
        to: ethUtil.addHexPrefix(toAddressString),
        // assetID: ethUtil.setLengthLeft(ethUtil.bufferToHex(ethUtil.toBuffer(asset)), 4),
        outputNumberInTransaction: '0x01',
        amountBuffer
    }
    const output = new TransactionOutput(outputParams);
    const txTypeBuffer = Buffer.alloc(1)
    txTypeBuffer.writeUInt8(TxTypeFund,0)

    const depositRecordParams = {
        to: ethUtil.addHexPrefix(toAddressString),
        outputNumberInTransaction: '0x02',
        amountBuffer: ethUtil.setLengthLeft(ethUtil.toBuffer(depositIndexBN),valueBufferLength)
    }
    const auxOutput = new TransactionOutput(depositRecordParams);

    const txParams = {
        transactionType: txTypeBuffer,
        inputNum1: Buffer.concat(input.raw),
        outputNum1: Buffer.concat(output.raw),
        outputNum2: Buffer.concat(auxOutput.raw)
    }
    const tx = new PlasmaTransaction(txParams);
    tx.sign(plasmaOperatorPrivKey); 
    return tx;
}
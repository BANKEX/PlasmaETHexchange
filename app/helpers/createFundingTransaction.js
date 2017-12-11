const config = require("../config/config");
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

// const plasmaOperatorPrivKeyHex = config.plasmaOperatorPrivKeyHex;
// const plasmaOperatorPrivKey = ethUtil.toBuffer(plasmaOperatorPrivKeyHex);
const {PlasmaTransaction,
    TxTypeFund, 
    TxTypeMerge, 
    TxTypeSplit, 
    TxTypeWithdraw, 
    TxTypeTransfer,
    TxLengthForTypes} = require("../../lib/Tx/tx");

const {TransactionInput, TransactionInputLength} = require("../../lib/Tx/input");
const {TransactionOutput, TransactionOutputLength} = require("../../lib/Tx/output");
const dummyInput = new TransactionInput();
const dummyOutput = new TransactionOutput();

module.exports = function createFundingTransaction(toAddressString, amountBN, depositIndexBN) {
    const amountBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(amountBN),txAmountLength)
    const inputParams = {
        blockNumber: '0x' + '00'.repeat(blockNumberLength),
        txNumberInBlock: '0x' +'00'.repeat(txNumberLength),
        // assetID: ethUtil.setLengthLeft(ethUtil.bufferToHex(ethUtil.toBuffer(asset)), 4),
        outputNumberInTransaction: '0x00',
        amountBuffer
    }
    const input = new TransactionInput(inputParams);
    const outputParams = {
        to: ethUtil.addHexPrefix(toAddressString),
        // assetID: ethUtil.setLengthLeft(ethUtil.bufferToHex(ethUtil.toBuffer(asset)), 4),
        outputNumberInTransaction: '0x00',
        amountBuffer
    }
    const output = new TransactionOutput(outputParams);
    const txTypeBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(TxTypeFund)),txTypeLength)

    const depositRecordParams = {
        to: ethUtil.addHexPrefix(toAddressString),
        outputNumberInTransaction: '0xff',
        amountBuffer: ethUtil.setLengthLeft(ethUtil.toBuffer(depositIndexBN),txAmountLength)
    }
    const auxOutput = new TransactionOutput(depositRecordParams);

    const txParams = {
        transactionType: txTypeBuffer,
        inputNum0: Buffer.concat(input.raw),
        outputNum0: Buffer.concat(output.raw),
        outputNum1: Buffer.concat(auxOutput.raw)
    }
    const tx = new PlasmaTransaction(txParams);
    return tx;

    // tx.sign(plasmaOperatorPrivKey); 
    // return tx;
}
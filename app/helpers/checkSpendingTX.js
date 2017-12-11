const config = require("../config/config");
const blockPrefix = config.blockPrefix;
const utxoPrefix = config.utxoPrefix;
const utxoIncludingAddressPrefix = config.utxoIncludingAddressPrefix;
const makeAddressIndex = config.makeAddressIndex;
const headerPrefix = config.headerPrefix;
const transactionPrefix=config.transactionPrefix;
const blockTime = config.blockTime;

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

const Web3 = require('web3');
const Block = require('../../lib/Block/block');
const ethUtil = require('ethereumjs-util'); 
const BN = ethUtil.BN;
const plasmaOperatorAddress = config.plasmaOperatorAddress;
const assert = require('assert');
const {PlasmaTransaction,
    TxTypeFund, 
    TxTypeMerge, 
    TxTypeSplit, 
    TxTypeWithdraw,
    TxTypeTransfer, 
    TxLengthForType,
    NumInputsForType,
    NumOutputsForType} = require('../../lib/Tx/tx');

const {TransactionInput} = require('../../lib/Tx/input');
const {TransactionOutput} = require('../../lib/Tx/output');

module.exports = function(levelDB) {
    return async function checkSpendingTX(spendingTx) {    
        if (spendingTx.getKey() == "000000000000000000") {
            return config.plasmaOperatorAddress === ethUtil.bufferToHex(spendingTx.getSenderAddress());
        } else {
            try{
                const senderAddress = spendingTx.getSenderAddress();
                var amountFromInputs = new BN(0)
                var amountFromOutputs = new BN(0)
                for (let inpIndex of [0,1]) {
                    const input = spendingTx.getTransactionInput(inpIndex)
                    if (input && typeof input != "undefined") {
                        const keyForUTXO = Buffer.concat([utxoPrefix, input.blockNumber, input.txNumberInBlock, input.outputNumberInTransaction]);
                        const unspentTxRaw = await levelDB.get(keyForUTXO)
                        const unspentTx = TransactionOutput.prototype.initFromBinaryBlob(unspentTxRaw);
                        if (!unspentTx){
                            return false
                        }
                        if (spendingTx.transactionTypeUInt() == TxTypeMerge) {
                            if (!unspentTx.to.equals(senderAddress)) {
                                if (!senderAddress.equals(ethUtil.toBuffer(config.plasmaOperatorAddress))) {
                                    return false
                                }
                            }
                        } else {
                            if (!unspentTx.to.equals(senderAddress)){
                                return false
                            }
                        }
                        amountFromInputs = amountFromInputs.add(unspentTx.value)
                    }
                }
                for (let outIndex of [0,1]) {
                    const output = spendingTx.getTransactionOutput(outIndex);
                    if (output && typeof output != "undefined" && !(output.outputNumberInTransaction.equals(Buffer.from('ff', 'hex'))) ) {
                        amountFromOutputs = amountFromOutputs.add(output.value)
                    }
                }
                return amountFromInputs.eq(amountFromOutputs);
            }
            catch(error){
                return false;
            }
        }
        return false;
    }
}
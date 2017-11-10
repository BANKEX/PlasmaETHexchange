const config = require("../config/config");
const ethUtil = require('ethereumjs-util'); 
const plasmaOperatorPrivKeyHex = config.plasmaOperatorPrivKeyHex;
const plasmaOperatorPrivKey = ethUtil.toBuffer(plasmaOperatorPrivKeyHex);
const Web3 = require('web3');
const BN = Web3.utils.BN;
const validateSchema = require('jsonschema').validate;
const {PlasmaTransaction,
    TxTypeFund, 
    TxTypeMerge, 
    TxTypeSplit, 
    TxTypeWithdraw, 
    TxTypeTransfer,
    TxLengthForType,
    NumInputsForType, 
    NumOutputsForType} = require("../../lib/Tx/tx");

const {TransactionInput, TransactionInputLength} = require("../../lib/Tx/input");
const {TransactionOutput, TransactionOutputLength} = require("../../lib/Tx/output");

const dummyInput = new TransactionInput();
const dummyOutput = new TransactionOutput();
const outputNumInTxLength = dummyOutput.outputNumberInTransaction.length;
const blockNumberLength = dummyInput.blockNumber.length;
const txNumberInBlockLength = dummyInput.txNumberInBlock.length;
const recipientLength = dummyOutput.to.length;
const valueBufferLength = dummyOutput.valueBuffer.length;

const transactionSchemaNoSignature = 
{
    "txType" : {"type" : "integer", "minimum" : 1, "maximum" : 5},
    "inputs": {
        "type": "array",
        "items": {"type": "object",
            "properties": {
            "blockNumber": {"type": "integer", "minimum": 1},
            "txNumber": {"type": "integer", "minimum": 1},
            "outputNumber" : {"type": "integer", "minimum": 1}
            }
        }
    },
    "outputs": {
        "type": "array",
        "items": {"type": "object",
            "properties": {
            "to": {"type": "string", "minLength": 40, "maxLength": 42},
            "amount": {"type": "string", "minLength": 1},  
            }
        }
    }
}

const transactionSchemaWithSignature = {
        "txType" : {"type" : "integer", "minimum" : 1, "maximum" : 5},
        "inputs": {
            "type": "array",
            "items": {"type": "object",
                "properties": {
                "blockNumber": {"type": "integer", "minimum": 1},
                "txNumber": {"type": "integer", "minimum": 1},
                "outputNumber" : {"type": "integer", "minimum": 1}
                }
            }
        },
        "outputs": {
            "type": "array",
            "items": {"type": "object",
                "properties": {
                "to": {"type": "string", "minLength": 40, "maxLength": 42},
                "amount": {"type": "string", "minLength": 1},  
                }
            }
        },
        "v": {"type": "string", "minLength": 2, "maxLength": 2},
        "r": {"type": "string", "minLength": 44, "maxLength": 44},
        "s": {"type": "string", "minLength": 44, "maxLength": 44}
}
module.exports = function (levelDB) {
    const getUTXO = require('./getUTXO')(levelDB);
    const getTX = require('./getTX')(levelDB);
    return async function (transactionJSON) {
        try{
            if (!validateSchema(transactionJSON, transactionSchemaNoSignature).valid) {
                return null
            }
            const txType = transactionJSON.txType;
            const numInputs = transactionJSON.inputs.length;
            const numOutputs = transactionJSON.outputs.length;
            if (numInputs != NumInputsForType[txType] || numOutputs != NumOutputsForType[txType]){
                return null;
            }
            let inputsTotalValue = new BN(0);
            let outputsTotalValue = new BN(0);
            const txParams = {}
            let inputCounter = 0;
            for (let inputJSON of transactionJSON.inputs) {
                inputCounter++
                const unspentOutput = await getUTXO(inputJSON.blockNumber, inputJSON.txNumber, inputJSON.outputNumber);
                if (!unspentOutput) {
                    return null;
                }
                // const TX = await getTX(inputJSON.blockNumber, inputJSON.txNumber);
                const blockNumberBuffer = Buffer.alloc(blockNumberLength);
                blockNumberBuffer.writeUInt32BE(inputJSON.blockNumber);
                const txNumberBuffer = Buffer.alloc(txNumberInBlockLength)
                txNumberBuffer.writeUInt16BE(inputJSON.txNumber)
                const txOutputNumberBuffer = Buffer.alloc(outputNumInTxLength)
                txOutputNumberBuffer.writeUInt8(inputJSON.outputNumber)
                const inputParams = {
                    blockNumber: blockNumberBuffer,
                    txNumberInBlock: txNumberBuffer,
                    outputNumberInTransaction: txOutputNumberBuffer,
                    amountBuffer: unspentOutput.amountBuffer
                }
                const input = new TransactionInput(inputParams);
                inputsTotalValue = inputsTotalValue.add(unspentOutput.value);
                txParams["inputNum"+inputCounter]=Buffer.concat(input.raw);
            }
            let outputCounter = 0;
            for (let outputJSON of transactionJSON.outputs) {
                outputCounter++
                const outputNumberBuffer = Buffer.alloc(1);
                outputNumberBuffer.writeUInt8(outputCounter);
                const outputValue = new BN(outputJSON.amount);
                if (outputValue.lte(0)) {
                    return null;
                }
                outputsTotalValue = outputsTotalValue.add(outputValue);
                const outputParams = {
                    to: ethUtil.addHexPrefix(outputJSON.to),
                    // assetID: ethUtil.setLengthLeft(ethUtil.bufferToHex(ethUtil.toBuffer(asset)), 4),
                    outputNumberInTransaction: outputNumberBuffer,
                    amountBuffer: ethUtil.setLengthLeft(ethUtil.toBuffer(outputValue),valueBufferLength)
                }
                const transactionOutput = new TransactionOutput(outputParams);
                txParams["outputNum"+outputCounter] = Buffer.concat(transactionOutput.raw);
                
            }
            if (outputsTotalValue.gt(inputsTotalValue)) {
                return null;
            }
            if (txType == TxTypeMerge) {
                if (txParams["outputNum1"].to !== txParams["outputNum2"].to){
                    return null;
                }
            }
            const txTypeBuffer = Buffer.alloc(1)
            txTypeBuffer.writeUInt8(txType)
            txParams.transactionType = txTypeBuffer;
            const tx = new PlasmaTransaction(txParams);
            return tx;
        }
        catch(err){
            return null;
        }
    }
}
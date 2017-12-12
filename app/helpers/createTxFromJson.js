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
    },
    "required": ["txType", "inputs", "outputs"]
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
        "s": {"type": "string", "minLength": 44, "maxLength": 44},
        "required": ["txType", "inputs", "outputs", "v", "r", "s"]
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
            const numOutputs = transactionJSON.outputs.length
            if (numInputs != NumInputsForType[txType] || numOutputs != NumOutputsForType[txType]){
                return null;
            }
            let inputsTotalValue = new BN(0);
            let outputsTotalValue = new BN(0);
            const txParams = {}
            let inputCounter = 0;
            // const inputs = []
            for (let inputJSON of transactionJSON.inputs) {
                const unspentOutput = await getUTXO(inputJSON.blockNumber, inputJSON.txNumber, inputJSON.outputNumber);
                if (!unspentOutput) {
                    return null;
                }
                const blockNumberBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(inputJSON.blockNumber)),blockNumberLength)
                const txNumberBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(inputJSON.txNumber)),txNumberLength)
                const txOutputNumberBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(inputJSON.outputNumber)),txOutputNumberLength)
                const inputParams = {
                    blockNumber: blockNumberBuffer,
                    txNumberInBlock: txNumberBuffer,
                    outputNumberInTransaction: txOutputNumberBuffer,
                    amountBuffer: unspentOutput.amountBuffer
                }
                const input = new TransactionInput(inputParams);
                // inputs.push(input)
                inputsTotalValue = inputsTotalValue.add(unspentOutput.value);
                txParams["inputNum"+inputCounter]=Buffer.concat(input.raw);
                inputCounter++;
            }
            let outputCounter = 0;
            for (let outputJSON of transactionJSON.outputs) {
                const outputNumberBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(outputCounter)),txOutputNumberLength)
                const outputValue = new BN(outputJSON.amount);
                if (outputValue.lte(0)) {
                    return null;
                }
                outputsTotalValue = outputsTotalValue.add(outputValue);
                const addr = ethUtil.addHexPrefix(outputJSON.to.toLowerCase());
                if (addr == undefined) {
                    return null;
                }
                const outputParams = {
                    to: addr,
                    // assetID: ethUtil.setLengthLeft(ethUtil.bufferToHex(ethUtil.toBuffer(asset)), 4),
                    outputNumberInTransaction: outputNumberBuffer,
                    amountBuffer: ethUtil.setLengthLeft(ethUtil.toBuffer(outputValue),txAmountLength)
                }
                const transactionOutput = new TransactionOutput(outputParams);
                txParams["outputNum"+outputCounter] = Buffer.concat(transactionOutput.raw);
                outputCounter++
            }
            if (!outputsTotalValue.eq(inputsTotalValue)) {
                return null;
            }
            // if (txType == TxTypeMerge) {
            //     if (! inputs[0].to.equals(inputs[1].to)){
            //         return null;
            //     }
            // }
            const txTypeBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(txType)), txTypeLength)
            txParams.transactionType = txTypeBuffer;
            const tx = new PlasmaTransaction(txParams);
            return tx;
        }
        catch(err){
            return null;
        }
    }
}
// For demo purposes only
const Web3 = require('web3');
const validateSchema = require('jsonschema').validate;
const config = require("../config/config");
const ethUtil = require('ethereumjs-util'); 
const lengthConstants = require("../../lib/dataStructureLengths");
const assert = require('assert');

const {PlasmaTransaction,
    TxTypeFund, 
    TxTypeMerge, 
    TxTypeSplit, 
    TxTypeWithdraw, 
    TxTypeTransfer,
    TxLengthForType,
    NumInputsForType, 
    NumOutputsForType} = require("../../lib/Tx/tx");

const transactionSchema = 
{
    // "from": {"type": "string", "minLength": 40, "maxLength": 42},
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
    "signature" : {"type" : "string", "minLength" :130, "maxLength" : 132},
    "required": ["txType", "inputs", "signature"]
}
module.exports = function(app, levelDB, web3) {
    const createTxFromJSON = require('../helpers/createTxFromJson')(levelDB);
    const createWithdrawTxFromJSON = require('../helpers/createWithdrawTxFromJson')(levelDB);
    const checkSpendingTX = require('../helpers/checkSpendingTX')(levelDB);
    app.post('/sendSignedTX', 'endSignedTX', async function(req, res){
        try{ 
            if (!validateSchema(req.body, transactionSchema).valid) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            const txParams = req.body;
            const signature = req.body.signature;
            delete txParams.signature;
            let tx;
            if (req.body.txType == TxTypeMerge || req.body.txType == TxTypeSplit || req.body.txType == TxTypeTransfer) {
                tx = await createTxFromJSON(req.body);
            } else {
                tx = await createWithdrawTxFromJSON(req.body);
            }
            tx.serializeSignature(signature);
            const validSpending = await checkSpendingTX(tx);
            assert(validSpending);
            const txHash = tx.hash(false, false);
            const pubKey = ethUtil.ecrecover(txHash, ethUtil.bufferToInt(tx.v), tx.r, tx.s);
            const signedFromAddress = ethUtil.publicToAddress(pubKey).toString('hex');
            console.log("Accepted TX from address 0x" + signedFromAddress);
            const txIsValid = tx.validate(false);
            assert(txIsValid);
            app.txQueueArray.push(tx);
            console.log("Pushed new TX")
            const txJSONrepresentation = tx.toFullJSON(true);
            return res.json({error: false, 
                tx: txJSONrepresentation});
        }
        catch(error){
            res.json({error: true, reason: "invalid transaction"});
        }
    });
}
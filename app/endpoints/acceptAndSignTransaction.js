// For demo purposes only
const Web3 = require('web3');
const validateSchema = require('jsonschema').validate;
const config = require("../config/config");
const testPrivKeys = config.testPrivKeys;
const testAccounts = config.testAccounts;
const ethUtil = require('ethereumjs-util'); 

const transactionSchema = 
{
    "from": {"type": "string", "minLength": 40, "maxLength": 42},
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
module.exports = function(app, levelDB, web3) {
    const createTxFromJSON = require('../helpers/createTxFromJson')(levelDB);
    app.post('/sendAndSign', 'sendAndSignPlasmaTransaction', async function(req, res){
        try{ 
            if (!validateSchema(req.body, transactionSchema).valid) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            const from = ethUtil.addHexPrefix(req.body.from);
            const idxInKeys = testAccounts.indexOf(from);
            if (idxInKeys != 1 && idxInKeys != 0){
                return res.json({error: true, reason: "invalid transaction"});
            } 
            const tx = await createTxFromJSON(req.body);
            let txRaw = ethUtil.bufferToHex(Buffer.concat(tx.clearRaw(false, false)));
            let txHash = ethUtil.bufferToHex(tx.hash(false,false));
            const signature = await web3.eth.sign(txRaw, from);
            const signature2 = await web3.eth.sign(txHash, from);
            tx.serializeSignature(signature);
            if (!tx.validate()){
                return res.json({error: true, reason: "invalid transaction"});
            }
            app.txQueueArray.push(tx);
            console.log("Pushed new TX")
            return res.json({error: false, status: "accepted"});
        }
        catch(error){
            res.json({error: true, reason: "invalid transaction"});
        }
    });
}
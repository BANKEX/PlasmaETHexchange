// For demo purposes only
const Web3 = require('web3');
const validateSchema = require('jsonschema').validate;
const config = require("../config/config");
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
    app.post('/createTX', 'createTX', async function(req, res){
        try{ 
            if (!validateSchema(req.body, transactionSchema).valid) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            const from = ethUtil.addHexPrefix(req.body.from);
            const tx = await createTxFromJSON(req.body);
            const txJSONrepresentation = tx.toFullJSON(true);
            return res.json({error: false, tx: txJSONrepresentation});
        }
        catch(error){
            res.json({error: true, reason: "invalid transaction"});
        }
    });
}
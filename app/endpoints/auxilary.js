const Web3 = require('web3');
const validateSchema = require('jsonschema').validate;
const config = require("../config/config");
const ethUtil = require('ethereumjs-util'); 
const testPrivKeys = config.testPrivKeys;
const testAccounts = config.testAccounts;
const plasmaOperatorPrivKeyHex = config.plasmaOperatorPrivKeyHex;
const plasmaOperatorPrivKey = ethUtil.toBuffer(plasmaOperatorPrivKeyHex);
const plasmaOperatorAddress = config.plasmaOperatorAddress;


module.exports = function(app, levelDB, web3) {
    app.get('/ethereumBalance/:address', 'balanceForAddress', async function(req, res){
        try{ 
            let addressString = req.params.address
            addressString = ethUtil.addHexPrefix(addressString)
            const bal = await web3.eth.getBalance(addressString);
            return res.json({balanceInWei:bal});
        }
        catch(error){
            return res.json({error: true, reason: "invalid address"});
        }
    });

    app.get('/plasmaParent/blockHeader/:blockNumber', 'getParentContractHeader', async function(req, res){
        try{ 
            const blockNumber = parseInt(req.params.blockNumber);
            if (!blockNumber){
                return res.json({error: true, reason: "invalid block number"});
            }
            var header = await app.DeployedPlasmaContract.methods.headers(blockNumber).call({from: plasmaOperatorAddress});
            return res.json(header)
        }
        catch(error){
            res.json({error: true, reason: "invalid address"});
        }
    });

    app.get('/plasmaParent/withdrawRecord/:withdrawIndex', 'getParentContractHeader', async function(req, res){
        try{ 
            const withdrawIndex = parseInt(req.params.withdrawIndex);
            if (!withdrawIndex){
                return res.json({error: true, reason: "invalid withdraw index number"});
            }
            var header = await app.DeployedPlasmaContract.methods.withdrawRecords(0,withdrawIndex).call({from: plasmaOperatorAddress});
            return res.json(header)
        }
        catch(error){
            res.json({error: true, reason: "invalid address"});
        }
    });

}
const Web3 = require('web3');
const BN = Web3.utils.BN;
const validateSchema = require('jsonschema').validate;
const config = require("../config/config");
const ethUtil = require('ethereumjs-util'); 
const assert = require('assert');
// const testPrivKeys = config.testPrivKeys;
// const testAccounts = config.testAccounts;
// const plasmaOperatorPrivKeyHex = config.plasmaOperatorPrivKeyHex;
// const plasmaOperatorPrivKey = ethUtil.toBuffer(plasmaOperatorPrivKeyHex);
const plasmaOperatorAddress = config.plasmaOperatorAddress;


module.exports = function(app, levelDB, web3) {
    app.get('/ethereumBalance/:address', 'balanceForAddress', async function(req, res){
        try{ 
            let addressString = req.params.address
            addressString = ethUtil.addHexPrefix(addressString)
            assert(ethUtil.isValidAddress(addressString))
            const bal = await web3.eth.getBalance(addressString);
            return res.json({balanceInWei:bal});
        }
        catch(error){
            return res.json({error: true, reason: "invalid address"});
        }
    });

    app.get('/plasmaParent/depositIndexes/:address', 'getDepositRecordsForAddress', async function(req, res){
        try{ 
            let addressString = req.params.address
            addressString = ethUtil.addHexPrefix(addressString)
            assert(ethUtil.isValidAddress(addressString))
            const recordIndexes = await app.DeployedPlasmaContract.methods.depositRecordsForUser(addressString).call();
            return res.json({depositIndexes:recordIndexes});
        }
        catch(error){
            return res.json({error: true, reason: "invalid address"});
        }
    });

    app.get('/plasmaParent/allDeposits/:address', 'getDepositRecordsForAddress', async function(req, res){
        try{ 
            let addressString = req.params.address
            addressString = ethUtil.addHexPrefix(addressString)
            assert(ethUtil.isValidAddress(addressString))
            const recordIndexes = await app.DeployedPlasmaContract.methods.depositRecordsForUser(addressString).call();
            const requests = recordIndexes.map((idx) => {
                const index = Web3.utils.toBN(idx)
                return app.DeployedPlasmaContract.methods.depositRecords(0,index).call();
            })
            let results = await Promise.all(requests)
            return res.json({error: false, depositRecords:results});
        }
        catch(error){
            return res.json({error: true, reason: "invalid address"});
        }
    });

    app.get('/plasmaParent/depositRecord/:recordID', 'getDepositRecord', async function(req, res){
        try{ 
            let index = Web3.utils.toBN(req.params.recordID);
            if (!index){
                return res.json({error: true, reason: "invalid record index number"});
            }
            const record = await app.DeployedPlasmaContract.methods.depositRecords(0,index).call();
            return res.json({error: false, record})
        }
        catch(error){
            res.json({error: true, reason: "invalid address"});
        }
    });

    app.get('/plasmaParent/lastSubmittedHeader', 'lastSubmittedHeader', async function(req, res){
        try{ 
            const headerNumber = await app.DeployedPlasmaContract.methods.lastBlockNumber().call();
            return res.json({error: false, lastSubmittedHeader:headerNumber});
        }
        catch(error){
             return res.json({error: true, reason: "invalid request"});
        }
    });

    app.get('/plasmaParent/blockHeader/:blockNumber', 'getParentContractHeader', async function(req, res){
        try{ 
            const blockNumber = Web3.utils.toBN(req.params.blockNumber);
            if (!blockNumber){
                return res.json({error: true, reason: "invalid block number"});
            }
            var header = await app.DeployedPlasmaContract.methods.headers(blockNumber).call();
            return res.json({error: false, header})
        }
        catch(error){
            res.json({error: true, reason: "invalid address"});
        }
    });

    app.get('/plasmaParent/withdrawIndexes/:address', 'getWithdrawRecordsForAddress', async function(req, res){
        try{ 
            let addressString = req.params.address
            addressString = ethUtil.addHexPrefix(addressString)
            assert(ethUtil.isValidAddress(addressString))
            const recordIndexes = await app.DeployedPlasmaContract.methods.withdrawRecordsForUser(addressString).call();
            return res.json({error: false, withdrawIndexes: recordIndexes});
        }
        catch(error){
            return res.json({error: true, reason: "invalid address"});
        }
    });
    app.get('/plasmaParent/withdrawRecord/:withdrawIndex', 'getParentContractHeader', async function(req, res){
        try{ 
            const withdrawIndex = Web3.utils.toBN(req.params.withdrawIndex);
            if (!withdrawIndex){
                return res.json({error: true, reason: "invalid withdraw index number"});
            }
            const record = await app.DeployedPlasmaContract.methods.withdrawRecords(0,withdrawIndex).call();
            return res.json({error: false, withdrawRecord: record})
        }
        catch(error){
            res.json({error: true, reason: "invalid address"});
        }
    });

    app.get('/plasmaParent/allWithdraws/:address', 'getWithdrawRecordsForAddress', async function(req, res){
        try{ 
            let addressString = req.params.address
            addressString = ethUtil.addHexPrefix(addressString)
            assert(ethUtil.isValidAddress(addressString))
            const recordIndexes = await app.DeployedPlasmaContract.methods.withdrawRecordsForUser(addressString).call();
            const requests = recordIndexes.map((idx) => {
                const index = Web3.utils.toBN(idx)
                return app.DeployedPlasmaContract.methods.withdrawRecords(0,index).call();
            })
            let results = await Promise.all(requests)
            return res.json({error: false, withdrawRecords:results});
        }
        catch(error){
            return res.json({error: true, reason: "invalid address"});
        }
    });

}
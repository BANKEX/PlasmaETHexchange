const Web3 = require('web3');
const BN = Web3.utils.BN;
const ethUtil = require('ethereumjs-util');
const config = require('../config/config');
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

module.exports = function(app, levelDB, web3) {
    const DeployedPlasmaContract = app.DeployedPlasmaContract;
    const processDepositEvent = require('../helpers/processDepositEvent')(app.txQueueArray);
    const getBlockByNumber = require('../helpers/getBlock')(levelDB);
    const prepareProofsForWithdraw = require('../helpers/prepareProofForTX')(levelDB);
    const getTX = require('../helpers/getTX')(levelDB);
    app.post('/fundPlasma', 'fundPlasma', async function(req, res){
        try{ 
            const {toAddress} = req.body
            if (!toAddress) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            var result = await DeployedPlasmaContract.methods.deposit().send({from: toAddress, value: Web3.utils.toWei(0.1, 'ether'), gas: 3000000});
            if (!result) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            const depositEvent = result.events.DepositEvent
            // processDepositEvent(depositEvent)
            return res.json({error: false, depositEvent});
        }
        catch(error){
             res.json({error: true, reason: "invalid transaction"});
        }
    });


    app.post('/startDepositWithdraw', 'fundPlasma', async function(req, res){
        try{ 
            const {from, depositIndex} = req.body
            if (!from || !depositIndex) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            const index = Web3.utils.toBN(depositIndex);
            var result = await DeployedPlasmaContract.methods.startDepositWithdraw(index).send({from: from, gas: 3000000});
            if (!result) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            const depositWithdrawStartedEvent = result.events.DepositWithdrawStartedEvent;
            return res.json({error: false, depositWithdrawStartedEvent});
        }
        catch(error){
             res.json({error: true, reason: "invalid transaction"});
        }
    });

    app.post('/challengeDepositWithdraw', 'fundPlasma', async function(req, res){
        try{ 
            const {blockNumber, txNumber, depositIndex} = req.body
            if (!blockNumber || !depositIndex) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            const index = Web3.utils.toBN(depositIndex);
            const txNumberInBlock = txNumber;
            const tx = await getTX(blockNumber, txNumberInBlock);
            if (!tx) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            assert(tx.transactionTypeUInt() == TxTypeFund)
            const preparedProof = await prepareProofsForWithdraw(blockNumber, txNumberInBlock);
            const result = await app.DeployedPlasmaContract.methods.challengeDepositWithdraw(index, preparedProof.blockNumber, 
                // preparedProof.txNumberInBlock, 
                preparedProof.tx, preparedProof.merkleProof ).send({from:plasmaOperatorAddress, gas: 3.6e6});
            const depositWithdrawChallengedEvent = result.events.DepositWithdrawChallengedEvent;
            const response = {error: false, depositWithdrawChallengedEvent};
            return res.json(response);
        }
        catch(error){
            res.json({error: true, reason: "invalid transaction"});
        }
    });

}

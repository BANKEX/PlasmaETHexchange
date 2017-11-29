//demo purposes only
const Web3 = require('web3');
const ethUtil = require('ethereumjs-util'); 
const BN = ethUtil.BN;
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

const encodeForRemix = require("../helpers/hexDataToEncodedBytes");

module.exports = function(app, levelDB, web3) {
    const getBlockByNumber = require('../helpers/getBlock')(levelDB);
    const getTX = require('../helpers/getTX')(levelDB);
    const prepareProofsForWithdraw = require('../helpers/prepareProofForTX')(levelDB);
    app.post('/startWithdraw', 'startWithdraw', async function(req, res){
        try{ 
            const {blockNumber, txNumber, txOutputNumber, from} = req.body
            if (!blockNumber || !from) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            const txNumberInBlock = txNumber;
            const tx = await getTX(blockNumber, txNumberInBlock);
            if (!tx) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            assert(tx.transactionTypeUInt() == TxTypeSplit || 
                tx.transactionTypeUInt() == TxTypeMerge || 
                tx.transactionTypeUInt() == TxTypeTransfer ||
                tx.transactionTypeUInt() == TxTypeFund)
            const preparedProof = await prepareProofsForWithdraw(blockNumber, txNumberInBlock);
            const result = await app.DeployedPlasmaContract.methods.startWithdraw(preparedProof.blockNumber, 
                preparedProof.txNumberInBlock, req.body.txOutputNumber, preparedProof.tx, preparedProof.merkleProof ).send({from:from, gas: 3.6e6});
            const acceptanceEvent = result.events.WithdrawRequestAcceptedEvent; 
            const withdrawStartedEvent = result.events.WithdrawStartedEvent;
            console.log(acceptanceEvent);
            console.log(withdrawStartedEvent);
            const response =  {error: false, status: "accepted",
                    withdrawIndex: acceptanceEvent.returnValues._withdrawIndex, 
                    acceptanceEvent,
                    withdrawStartedEvent}
            return res.json(response);
        }
        catch(error){
            res.json({error: true, reason: "invalid transaction"});
        }
    });

    app.post('/finalizeWithdrawExpress', 'finalizeWithdrawExpress', async function(req, res){
        try{ 
            const {blockNumber, txNumber, from} = req.body
            if (!blockNumber || !from) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            const txNumberInBlock = txNumber;
            const blockNumberBuffer = ethUtil.toBuffer(blockNumber)
            const txNumberInBlockBuffer = ethUtil.toBuffer(txNumberInBlock)
            const tx = await getTX(blockNumber, txNumberInBlock);
            if (!tx) {
                return res.json({error: true, reason: "invalid transaction"});
            }
            assert(tx.transactionTypeUInt() == TxTypeWithdraw)
            const preparedProof = await prepareProofsForWithdraw(blockNumber, txNumberInBlock);
            const result = await app.DeployedPlasmaContract.methods.finalizeWithdrawExpress(preparedProof.blockNumber, 
                preparedProof.txNumberInBlock, preparedProof.tx, preparedProof.merkleProof ).send({from:from, gas: 3.6e6});
            const withdrawFinalizedEvent = result.events.WithdrawFinalizedEvent;
            console.log(withdrawFinalizedEvent);
            const response =  {error: false, status: "accepted", 
                    withdrawIndex: withdrawFinalizedEvent.returnValues._withdrawIndex,
                withdrawFinalizedEvent}
            return res.json(response);
        }
        catch(error){
            res.json({error: true, reason: "invalid transaction"});
    
        }
    });
}
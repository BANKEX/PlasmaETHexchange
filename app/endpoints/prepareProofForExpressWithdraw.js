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

    app.post('/prepareProofForExpressWithdraw', 'prepareProofForExpressWithdraw', async function(req, res){
        try{ 
            const {blockNumber, txNumber} = req.body
            if (!blockNumber || txNumber==undefined) {
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
            return res.json({error: false, 
                proof: {
                    blockNumber: preparedProof.blockNumber,
                    txNumber:preparedProof.txNumberInBlock, 
                    tx: preparedProof.tx, 
                    merkleProof: preparedProof.merkleProof
                }
            })
        }
        catch(error){
            res.json({error: true, reason: "invalid transaction"});
    
        }
    });
}
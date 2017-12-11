const createFundingTransaction = require('./createFundingTransaction');
const Web3 = require('web3');
const BN = Web3.utils.BN;
const config = require('../config/config');
const ethUtil = require('ethereumjs-util');
module.exports = function(app, web3) {
    return async function processWithdrawFinalizedEvent(event){
        const {_blockNumber, _txNumberInBlock, _outputNumberInTX} = event.returnValues;
        const keyForWithdrawalIndex = Buffer.concat([config.withdrawsForAddressPrefix,
            senderAddress,
            ethutil.blockNumber, 
            tx.transactionNumberInBlock])
        let depositIndexBN = new BN(_depositIndex);
        const tx = createFundingTransaction(_from, new Web3.utils.BN(_amount), depositIndexBN);
        let txRaw = ethUtil.bufferToHex(Buffer.concat(tx.clearRaw(false, false)));
        const txHash = tx.hash(false,false).toString('hex');
        const signature = await web3.eth.sign(txRaw, config.plasmaOperatorAddress);
        tx.serializeSignature(signature);
        // const pubKey = ethUtil.ecrecover(txHash, ethUtil.bufferToInt(tx.v), tx.r, tx.s);
        // const signedFromAddress = ethUtil.publicToAddress(pubKey).toString('hex');
        if (tx.validate()) {
            app.txQueueArray.push(tx);
            console.log("Pushed new TX")
            console.log(event);
        }
        else {
            console.log("Invalid funding TX");
        }
    }
}
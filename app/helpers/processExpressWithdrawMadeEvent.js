const createFundingTransaction = require('./createFundingTransaction');
const Web3 = require('web3');
const BN = Web3.utils.BN;
const config = require('../config/config');
const ethUtil = require('ethereumjs-util');

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
    

module.exports = function(app, levelDB, web3) {
    return async function processExpressWithdrawMakeEvent(event){
        const {_withdrawTxBlockNumber, _withdrawTxNumberInBlock, _from} = event.returnValues;
        let txBlockNumberBN = new BN(_withdrawTxBlockNumber);
        let txNumberInBlockBN =  new BN(_withdrawTxNumberInBlock);
        let senderAddress = ethUtil.toBuffer(_from);
        const keyForWithdrawalIndex = Buffer.concat([config.withdrawsForAddressPrefix,
            senderAddress,
            ethUtil.setLengthLeft(ethUtil.toBuffer(txBlockNumberBN),blockNumberLength), 
            ethUtil.setLengthLeft(ethUtil.toBuffer(txNumberInBlockBN),txNumberLength)])
        await levelDB.del(keyForWithdrawalIndex);
    }
}
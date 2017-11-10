const createFundingTransaction = require('./createFundingTransaction');
const Web3 = require('web3');
const BN = Web3.utils.BN;

module.exports = function(txQueueArray) {
    return function processDepositEvent(event){
        const {_from, _amount, _depositIndex} = event.returnValues;
        let depositIndexBN = new BN(_depositIndex);
        const tx = createFundingTransaction(_from, new Web3.utils.BN(_amount), depositIndexBN)
        txQueueArray.push(tx);
        console.log("Pushed new TX")
        console.log(event);
    }
}
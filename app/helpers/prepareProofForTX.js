//demo purposes only
const Web3 = require('web3');
const ethUtil = require('ethereumjs-util'); 
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

const encodeForRemix = require("./hexDataToEncodedBytes");

module.exports = function(levelDB) {
    const getBlockByNumber = require('./getBlock')(levelDB);
    const getTX = require('./getTX')(levelDB);

    return  async function prepareProofsForTX(blockNumber, txNumberInBlock) {
        const block = await getBlockByNumber(blockNumber);
        const tx = block.transactions[txNumberInBlock];
        const proof = ethUtil.bufferToHex(Buffer.concat(block.merkleTree.getProof(txNumberInBlock, true)));
        const raw = tx.raw.filter((r) => {
            return r != undefined;
        })
        const encodedTx = ethUtil.bufferToHex(Buffer.concat(raw))
        console.log(block.header.merkleRootHash.toString('hex'));
        console.log(JSON.stringify(encodeForRemix(proof)));
        console.log(JSON.stringify(encodeForRemix(encodedTx)));
        return {
            blockNumber: blockNumber,
            txNumberInBlock: txNumberInBlock,
            merkleProof: proof,
            tx: encodedTx
        }
    }
}
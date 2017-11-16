const config = require("./config/config");
const blockPrefix = config.blockPrefix;
const utxoPrefix = config.utxoPrefix;
const utxoIncludingAddressPrefix = config.utxoIncludingAddressPrefix;
const headerPrefix = config.headerPrefix;
const transactionPrefix=config.transactionPrefix;
const blockTime = config.blockTime;

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
    txToAddressLength} = require('../lib/dataStructureLengths');

const Web3 = require('web3');
const Block = require('../lib/Block/block');
const ethUtil = require('ethereumjs-util'); 
const BN = ethUtil.BN;
const plasmaOperatorPrivKeyHex = config.plasmaOperatorPrivKeyHex;
const plasmaOperatorPrivKey = ethUtil.toBuffer(plasmaOperatorPrivKeyHex);
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
    NumOutputsForType} = require('../lib/Tx/tx');
    
const encodeForRemix = require('./helpers/hexDataToEncodedBytes');

module.exports = function(app, levelDB, web3) {
    async function createBlock() {
        try{
            try{
                lastBlock = await levelDB.get('lastBlockNumber');
            }
            catch(error) {
                lastBlock = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(0)),blockNumberLength)
                await levelDB.put('lastBlockNumber', lastBlock);
            }
            try{
                lastBlockHash = await levelDB.get('lastBlockHash');
            }
            catch(error) {
                lastBlockHash = ethUtil.sha3('bankex.com')
                await levelDB.put('lastBlockHash', lastBlockHash);
            }

            let TXs;
            if (app.txQueueArray.length > 2**16){
                TXs = app.txQueueArray.splice(0, 2**16);
            } else {
                TXs = app.txQueueArray.splice(0, app.txQueueArray.length);
            }
            if (TXs.length == 0) {
                return false;
            }
            const allReferencedInputs = {};
            TXs = TXs.filter((tx) => {
                const key = tx.getKey();
                if (key === "00000000000001") {
                    return true;
                }
                if (!allReferencedInputs[key]) {
                    allReferencedInputs.key = true;
                    return true;
                }
                return false;
            })
            for (let i=0; i<TXs.length; i++) {
                // const txNumBuffer = Buffer.alloc(2);
                // txNumBuffer.writeUInt16BE(i);
                TXs[i].assignNumber(i);
            }
            const lastBlockNumber = Web3.utils.toBN(ethUtil.addHexPrefix(lastBlock.toString('hex')));
            const newBlockNumber = lastBlockNumber.add(new BN(1));
            const newBlockNumberBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(newBlockNumber), blockNumberLength);
            const blockParams = {
                blockNumber:  newBlockNumberBuffer,
                parentHash: lastBlockHash,
                transactions: TXs
            }
            const block = new Block(blockParams); 
            block.sign(plasmaOperatorPrivKey);
            assert(block.validate());
            await writeBlock(block);
            console.log("Created block " + newBlockNumber);
            const submitted = await submitBlockHeader(block)();
            if (!submitted) {
                throw("Couldn't submit");
            }
            console.log("Submitted header for block "+newBlockNumber)
            return true;
                
        }
        catch(err){
            console.log(err);
        }
    } 

    async function writeBlock(block) {
        var writeRequest =  levelDB.batch()
                        .put('lastBlockNumber', block.header.blockNumber)
                        .put('lastBlockHash', block.hash(true))
                        .put(Buffer.concat([blockPrefix,block.header.blockNumber]),Buffer.concat(block.raw))
                        .put(Buffer.concat([headerPrefix,block.header.blockNumber]),Buffer.concat(block.header.raw))
        block.transactions.forEach((tx, i)=>{ 
            for (let inpIndex of [0,1]) {
                const input = tx.getTransactionInput(inpIndex)
                if (input && typeof input != "undefined") {
                    const keyForUTXO = Buffer.concat([utxoPrefix, input.blockNumber, input.txNumberInBlock, input.outputNumberInTransaction]);
                    writeRequest.del(keyForUTXO)
                }
            }
            for (let outIndex of [0,1]) {
                const output = tx.getTransactionOutput(outIndex);
                if (output && typeof output != "undefined" && !(output.outputNumberInTransaction.equals(Buffer.from('ff', 'hex'))) ) {
                    const keyForUTXO = Buffer.concat([utxoPrefix, block.header.blockNumber, tx.transactionNumberInBlock, output.outputNumberInTransaction]);
                    writeRequest.put(keyForUTXO, Buffer.concat(output.raw))
                }
            }
            const r = tx.raw.filter((f) => {
                return (typeof f !== 'undefined')
            })
            writeRequest.put(Buffer.concat([transactionPrefix, block.header.blockNumber, tx.transactionNumberInBlock]), Buffer.concat(r))
        })

        await writeRequest.write();
    }

    async function checkUTXO(spendingTx) {

        if (spendingTx.blockNumber == 0 || (Buffer.isBuffer(spendingTx.blockNumber) && spendingTx.blockNumber.readUInt32BE(0) == 0) ) {
            return plasmaOperatorAddress.toLowerCase() === ('0x'+spendingTx.getSenderAddress().toString('hex')).toLowerCase();
            // return plasmaOperatorAddressBuffer.equals(spendingTx.getSenderAddress());
        } else {
            const keyForUnspent = Buffer.concat([utxoPrefix, spendingTx.blockNumber, spendingTx.txInBlock])
            try {
                unspentTxRaw = await levelDB.get(keyForUnspent)
                const unspentTx = new PlasmaTransaction(sliceRawBufferForTx(unspentTxRaw))
                if (!unspentTx.validate()){
                    return false
                }
                if (!unspentTx.to.equals(spendingTx.getSenderAddress())){
                    return false
                }
                return true;
            }
            catch(error){
                return false;
            }
        }
        return false;
    
    }

    function submitBlockHeader(block){
        return async function() {
            const hexData = ethUtil.addHexPrefix(Buffer.concat(block.header.raw).toString('hex'));
            console.log(JSON.stringify(encodeForRemix(hexData)));
            try{
                var res = await app.DeployedPlasmaContract.methods.submitBlockHeader(hexData).send({from: plasmaOperatorAddress, gas:3.5e6});
                return true;
            }
            catch(err){
                console.log(err)
            }
            return false
        }
    }

    async function tryToMine() {
        const mined = await createBlock();
        if (mined) {
            clearTimeout(blockMiningTimer);
            blockMiningTimer = setTimeout(async () => {
                tryToMine()
            }, blockTime);
            return
        }
        else{
            if (blockMiningTimer._called && blockMiningTimer._destroyed) {
                blockMiningTimer = setTimeout(async () => {
                    tryToMine()
                }, blockTime);
            }
            return;
        }
    }

    let blockMiningTimer = setTimeout(async () => {
        tryToMine()
    }, blockTime);
}
const config = require("./config/config");
const blockPrefix = config.blockPrefix;
const utxoPrefix = config.utxoPrefix;
const utxoIncludingAddressPrefix = config.utxoIncludingAddressPrefix;
const makeAddressIndex = config.makeAddressIndex;
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
    const checkSpendingTX = require('./helpers/checkSpendingTX')(levelDB);
    const getBlockByNumber = require('./helpers/getBlock')(levelDB);
    function startBlockProcessing(app, fromBlock) {
        processBlockForDepositEvents(fromBlock)().then((_dispose) => {
            console.log("Started block processing loop");
        })
    
        function processBlockForDepositEvents(previousBlockNumber) {
            return async function() {
                try{
                    let lastblock = await web3.eth.getBlockNumber();
                    if (previousBlockNumber == -1) {
                        previousBlockNumber = lastblock-1;
                    }  
                    if (lastblock > previousBlockNumber) {
                        lastblock = previousBlockNumber + 1;
                        // lastProcessedBlock = lastblock;
                        console.log("Started at block " + lastblock);
                        await processBlock(lastblock)();
                        setTimeout(processBlockForDepositEvents(lastblock), 100);
                        return;
                    } else {
                        setTimeout(processBlockForDepositEvents(lastblock), 1000);
                        return;
                    }
                }
                catch(error) {
                    console.log("Error processing block for events : " + error);
                    if (error.name == "Submitting too far in future") {
                        setImmediate(processBlockForDepositEvents(error.message));
                        return;
                    }
                    setImmediate(processBlockForDepositEvents(previousBlockNumber));
                }
            }
        }
    
        function processBlock(blockNumber) {
            return async function() {
                const expressWithdrawEventsInBlock = await app.DeployedPlasmaContract.getPastEvents("ExpressWithdrawMadeEvent",{
                    fromBlock: blockNumber,
                    toBlock: blockNumber
                });

                if (expressWithdrawEventsInBlock .length > 0) {
                    for (let i = 0; i< expressWithdrawEventsInBlock .length; i++){
                        await app.processExpressWithdrawMakeEvent(expressWithdrawEventsInBlock [i]);
                    }
                }


                const depositEventsInBlock = await app.DeployedPlasmaContract.getPastEvents("DepositEvent",{
                    fromBlock: blockNumber,
                    toBlock: blockNumber
                });

                if (depositEventsInBlock.length > 0) {
                    for (let i = 0; i< depositEventsInBlock.length; i++){
                        await app.processDepositEvent(depositEventsInBlock[i]);
                    }
                }
                const blockNumberBN = Web3.utils.toBN(blockNumber);
                const newBlockNumberBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(blockNumberBN), blockNumberLength);
                await levelDB.put(config.lastEventProcessedBlockPrefix, newBlockNumberBuffer);


            }
        } 
    }


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

            let sliceLen;
            let TXs;
            console.log("Mining a block")
            console.log("Queue length = " + app.txQueueArray.length);
            if (app.txQueueArray.length == 0) {
                return false;
            }
            if (app.txQueueArray.length > 2**16){
                // TXs = app.txQueueArray.splice(0, 2**16);
                TXs = app.txQueueArray.slice(0, 2**16);
                sliceLen = 2**16
            } else {
                // TXs = app.txQueueArray.splice(0, app.txQueueArray.length);
                TXs = app.txQueueArray.slice(0, app.txQueueArray.length);
                sliceLen = app.txQueueArray.length
            }
            if (TXs.length == 0) {
                return false;
            }
            const allReferencedInputs = {};
            TXs = TXs.filter((tx) => {
                const key = tx.getKey();
                if (key === "000000000000000000") {
                    return true;
                }
                if (!allReferencedInputs[key]) {
                    allReferencedInputs.key = true;
                    return true;
                }
                return false;
            })
            let TXsWithValidInputs = [];
            for (let i=0; i<TXs.length; i++) {
                const valid = await checkSpendingTX(TXs[i]);
                if (valid) {
                    TXsWithValidInputs.push(TXs[i]);
                }
            }
            TXs = TXsWithValidInputs
            for (let i=0; i<TXs.length; i++) {
                TXs[i].assignNumber(i);
            }
            if (TXs.length == 0) {
                return true;
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
            let blockRaw = block.clearRaw(false);
            blockRaw = ethUtil.bufferToHex(Buffer.concat(blockRaw));
            const signature = await web3.eth.sign(blockRaw, config.plasmaOperatorAddress);
            const blockHash = block.hash(false).toString('hex');
            console.log("Block hash = " + blockHash);
            console.log("Block signature = " + signature);
            block.serializeSignature(signature);
            assert(block.validate());
            await writeBlock(block);
            console.log("Created block " + newBlockNumber);
            app.txQueueArray = app.txQueueArray.slice(sliceLen);
            // const submitted = await submitBlockHeader(block)();
            // if (!submitted) {
            //     throw("Couldn't submit");
            // }
            // console.log("Submitted header for block "+newBlockNumber)
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
            const senderAddress = tx.getSenderAddress();
            for (let inpIndex of [0,1]) {
                const input = tx.getTransactionInput(inpIndex)
                if (input && typeof input != "undefined") {
                    const keyForUTXO = Buffer.concat([utxoPrefix, input.blockNumber, input.txNumberInBlock, input.outputNumberInTransaction]);
                    writeRequest.del(keyForUTXO)
                    if (makeAddressIndex) {
                        const keyForAddressUTXO = Buffer.concat([utxoIncludingAddressPrefix, senderAddress, input.blockNumber, input.txNumberInBlock, input.outputNumberInTransaction]);
                        writeRequest.del(keyForAddressUTXO)
                    }
                }
            }
            for (let outIndex of [0,1]) {
                const output = tx.getTransactionOutput(outIndex);
                if (output && typeof output != "undefined" && !(output.outputNumberInTransaction.equals(Buffer.from('ff', 'hex'))) ) {
                    const keyForUTXO = Buffer.concat([utxoPrefix, block.header.blockNumber, tx.transactionNumberInBlock, output.outputNumberInTransaction]);
                    writeRequest.put(keyForUTXO, Buffer.concat(output.raw))
                    if (makeAddressIndex) {
                        const recipientAddress = output.to;
                        const keyForAddressUTXO = Buffer.concat([utxoIncludingAddressPrefix, recipientAddress, block.header.blockNumber, tx.transactionNumberInBlock, output.outputNumberInTransaction]);
                        writeRequest.put(keyForAddressUTXO, Buffer.concat(output.raw))
                    }
                }
            }

            if (tx.transactionTypeUInt() == TxTypeWithdraw) {
                const keyForWithdrawalIndex = Buffer.concat([config.withdrawsForAddressPrefix,senderAddress,block.header.blockNumber, tx.transactionNumberInBlock])
                writeRequest.put(keyForWithdrawalIndex, Buffer.alloc(1, "0x01", "hex"))
            }

            if (config.makeTransactionIndexForAddress) {
                // if (ethUtil.bufferToHex(senderAddress).toLowerCase() != config.plasmaOperatorAddress.toLowerCase()) {
                    const transactionIndexKey = Buffer.concat([config.txForAddressIndexPrefix, senderAddress, block.header.blockNumber, tx.transactionNumberInBlock])
                    writeRequest.put(transactionIndexKey, Buffer.alloc(1, "0x01", "hex"))
                // }
            }

            const r = tx.clearRaw(true, true);
            writeRequest.put(Buffer.concat([transactionPrefix, block.header.blockNumber, tx.transactionNumberInBlock]), Buffer.concat(r))
        })

        await writeRequest.write();
    }

    function startHeadersSubmission(app, fromBlock) {
        processBlockNumberForSubmission(fromBlock)().then((_dispose) => {
            console.log("Started header submission loop");
        })
    
        function processBlockNumberForSubmission(previousBlockNumber) {
            return async function() {
                try{
                    let lastblock = await levelDB.get("lastBlockNumber");
                    lastblock = ethUtil.bufferToInt(lastblock);
                    if (lastblock == 0) {
                        setTimeout(processBlockNumberForSubmission(lastblock), 1000);
                        return;
                    }
                    if (previousBlockNumber == -1) {
                        previousBlockNumber = lastblock-1;
                    }  
                    if (lastblock > previousBlockNumber) {
                        lastblock = previousBlockNumber + 1;
                        console.log("Started header submission " + lastblock);
                        await processBlockForSubmission(lastblock)();
                        setTimeout(processBlockNumberForSubmission(lastblock), 100);
                        return;
                    } else {
                        setTimeout(processBlockNumberForSubmission(lastblock), 1000);
                        return;
                    }
                }
                catch(error) {
                    console.log("Error processing block header : " + error);
                    setImmediate(processBlockNumberForSubmission(previousBlockNumber));
                }
            }
        }
    
        function processBlockForSubmission(blockNumber) {
            return async function() {
                const block = await getBlockByNumber(blockNumber)
                const submitted = await submitBlockHeader(block)();
                if (!submitted) {
                    throw("Couldn't submit");
                }
                console.log("Submitted header for block "+blockNumber)
                const blockNumberBN = Web3.utils.toBN(blockNumber);
                const newBlockNumberBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(blockNumberBN), blockNumberLength);
                await levelDB.put(config.lastSubmittedHeaderPrefix, newBlockNumberBuffer);
            }
        } 
    }

    function submitBlockHeader(block){
        return async function() {
            const hexData = ethUtil.addHexPrefix(Buffer.concat(block.header.raw).toString('hex'));
            const blockNumber = Web3.utils.toBN(ethUtil.bufferToInt(block.header.blockNumber));
            console.log("Submitting header = " + hexData);
            let lastSubmitted;
            // console.log(JSON.stringify(encodeForRemix(hexData)));
            try{
                lastSubmitted = await app.DeployedPlasmaContract.methods.lastBlockNumber().call();
                lastSubmitted = Web3.utils.toBN(lastSubmitted)
                if (lastSubmitted.gte(blockNumber)) {
                    return true;
                }
                const distance = blockNumber.sub(lastSubmitted);
                const ONE = Web3.utils.toBN(1);
                if (distance.gt(ONE)) {
                    throw {name: "Submitting too far in future", message: lastSubmitted.toNumber()}
                }
                const gasCost = await app.DeployedPlasmaContract.methods.submitBlockHeader(hexData).estimateGas({from: config.plasmaOperatorAddress, gas: 1e6})
                const res = await app.DeployedPlasmaContract.methods.submitBlockHeader(hexData).send({from: config.plasmaOperatorAddress, gas: gasCost});
                const submissionEvent = res.events.HeaderSubmittedEvent.returnValues;
                console.log(submissionEvent);
                assert(submissionEvent._blockNumber == blockNumber.toString(10));
                return true;
            }
            catch(err){ 
                console.log(err)
                if (err.name == "Submitting too far in future"){
                    throw err;
                }
                if (err.message == "Returned error: gas required exceeds allowance or always failing transaction") {

                }
            }
            return false
        }
    }


    async function tryToMine() {
        const mined = await createBlock();
        setTimeout(tryToMine, blockTime)
        return true
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
    tryToMine.then((res) => {
        console.log("Started mining loop")
    })
    levelDB.get(config.lastEventProcessedBlockPrefix)
        .then((res) => {
            const lastProcessedBlock = Web3.utils.toBN(ethUtil.addHexPrefix(res.toString('hex'))).toNumber();
            // const lastProcessedBlock = 1383600 - 1;
            startBlockProcessing(app, lastProcessedBlock);
        })
        .catch((e) => {
            const lastProcessedBlock = -1;
            // const lastProcessedBlock = 1345677;
            startBlockProcessing(app, lastProcessedBlock);
    });

    levelDB.get(config.lastSubmittedHeaderPrefix)
    .then((res) => {
        const lastProcessedHeader = Web3.utils.toBN(ethUtil.addHexPrefix(res.toString('hex'))).toNumber();
        // const lastProcessedBlock = 1372150;
        startHeadersSubmission(app, lastProcessedHeader);
    })
    .catch((e) => {
        const lastProcessedHeader = -1;
        // const lastProcessedBlock = 1345677;
        startHeadersSubmission(app, lastProcessedHeader);
});
    
}
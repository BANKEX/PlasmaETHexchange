const config = require("../config/config");
const ethUtil = require('ethereumjs-util'); 
const blockPrefix = config.blockPrefix;
const utxoIncludingAddressPrefix = config.utxoIncludingAddressPrefix;
const utxoPrefix = config.utxoPrefix;
const {TransactionOutput} = require("../../lib/Tx/output");
const {TransactionInput} = require("../../lib/Tx/input");
const {BlockHeader} = require("../../lib/Block/blockHeader");
const assert = require('assert');

module.exports = function(levelDB) {
    const dummyInput = new TransactionInput();
    const dummyOutput = new TransactionOutput();
    const outputNumInTxLength = dummyOutput.outputNumberInTransaction.length;
    const blockNumberLength = dummyInput.blockNumber.length;
    const txNumberInBlockLength = dummyInput.txNumberInBlock.length;
    const recipientLength = dummyOutput.to.length;

    // return async function getUTXOforAddress(addressString, cb) {
    //     addressString = ethUtil.addHexPrefix(addressString)
    
    //     assert(ethUtil.isValidAddress(addressString));
    //     address = ethUtil.toBuffer(addressString);
    //     const utxos = [];
    //     const start = Buffer.concat([utxoIncludingAddressPrefix, 
    //         address,
    //         Buffer.alloc(blockNumberLength), 
    //         Buffer.alloc(txNumberInBlockLength), 
    //         Buffer.alloc(outputNumInTxLength)])
    //     const stop = Buffer.concat([utxoIncludingAddressPrefix, 
    //         address,
    //         Buffer.from("ff"*blockNumberLength, 'hex'), 
    //         Buffer.from("ff"*txNumberInBlockLength, 'hex'),
    //         Buffer.from("ff"*outputNumInTxLength, 'hex')])
    //     levelDB.createReadStream({gte: start,
    //                                 lte: stop,
    //                                 reversed:true})
    //     .on('data', function (data) {
    //         const out = TransactionOutput.prototype.initFromBinaryBlob(data);
    //         utxos.push(out);
    //     })
    //     .on('error', function (err) {
    //         console.log('Oh my!', err)
    //         cb(err, null)
    //     })
    //     .on('close', function () {
    //         // cb(null, utxos)
    //         console.log('Stream closed')
    //     })
    //     .on('end', function () {
    //         cb(null, utxos)
    //         console.log('Stream ended')
    //     })
    // }
    return async function getUTXOforAddress(addressString, cb) {
        addressString = ethUtil.addHexPrefix(addressString)
        assert(ethUtil.isValidAddress(addressString));
        address = ethUtil.toBuffer(addressString);
        const utxos = [];
        const start = Buffer.concat([utxoPrefix,
            Buffer.alloc(blockNumberLength), 
            Buffer.alloc(txNumberInBlockLength), 
            Buffer.alloc(outputNumInTxLength)])
        const stop = Buffer.concat([utxoPrefix,
            Buffer.from("ff".repeat(blockNumberLength), 'hex'), 
            Buffer.from("ff".repeat(txNumberInBlockLength), 'hex'),
            Buffer.from("ff".repeat(outputNumInTxLength), 'hex')])
        levelDB.createReadStream({gte: start,
                                    lte: stop,
                                    reversed:true})
        .on('data', function (data) {
            if (data.value.slice(0,20).equals(address)) {
                const out = TransactionOutput.prototype.initFromBinaryBlob(data.value);
                utxos.push(out);
            }
        })
        .on('error', function (err) {
            console.log('Oh my!', err)
            cb(err, null)
        })
        .on('close', function () {
            // cb(null, utxos)
            console.log('Stream closed')
        })
        .on('end', function () {
            cb(null, utxos)
            console.log('Stream ended')
        })
    }
}
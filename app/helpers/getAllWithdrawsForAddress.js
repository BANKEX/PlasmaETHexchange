const config = require("../config/config");
const ethUtil = require('ethereumjs-util'); 
const {blockPrefix, 
    utxoIncludingAddressPrefix, 
    utxoPrefix, 
    makeAddressIndex,
    withdrawsForAddressPrefix} = config;

const {TransactionOutput} = require("../../lib/Tx/output");
const {TransactionInput} = require("../../lib/Tx/input");
const {BlockHeader} = require("../../lib/Block/blockHeader");
const assert = require('assert');

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

module.exports = function(levelDB) {
    return getWithdrawsForAddress

    // if (config.makeTransactionIndexForAddress) {
    //     return getWithdrawsAddressWithIndex;
    // } else {
    //     return getTXsforAddress;
    // }

    async function getTXsforAddress(addressString, cb) {
        addressString = ethUtil.addHexPrefix(addressString)
        if (!ethUtil.isValidAddress(addressString)){
            cb(true, null);
        }
        address = ethUtil.toBuffer(addressString);
        const utxos = [];
        const start = Buffer.concat([utxoPrefix,
            Buffer.alloc(blockNumberLength), 
            Buffer.alloc(txNumberLength), 
            Buffer.alloc(txOutputNumberLength)])
        const stop = Buffer.concat([utxoPrefix,
            Buffer.from("ff".repeat(blockNumberLength), 'hex'), 
            Buffer.from("ff".repeat(txNumberLength), 'hex'),
            Buffer.from("ff".repeat(txOutputNumberLength), 'hex')])
        const sliceStart = utxoPrefix.length;
        levelDB.createReadStream({gte: start,
                                    lte: stop,
                                    reversed:true})
        .on('data', function (data) {
            if (data.value.slice(0,txToAddressLength).equals(address)) {
                const out = TransactionOutput.prototype.initFromBinaryBlob(data.value);
                toReturn = {};
                toReturn["blockNumber"] = ethUtil.bufferToInt(data.key.slice(sliceStart, sliceStart + blockNumberLength))
                toReturn["txNumberInBlock"] = ethUtil.bufferToInt(data.key.slice(sliceStart + blockNumberLength, sliceStart + blockNumberLength + txNumberLength))
                toReturn["outputNumberInTransaction"] = ethUtil.bufferToInt(data.key.slice(sliceStart + blockNumberLength + txNumberLength, sliceStart + blockNumberLength + txNumberLength + txOutputNumberLength))
                toReturn["value"] = out.value.toString(10);
                toReturn['output'] = out;
                utxos.push(toReturn);
            }
        })
        .on('error', function (err) {
            console.log('Oh my!', err)
            cb(err, null)
        })
        .on('close', function () {
            // cb(null, utxos)
            // console.log('Stream closed')
        })
        .on('end', function () {
            cb(null, utxos)
            // console.log('Stream ended')
        })
    }

    async function getWithdrawsForAddress(addressString, cb) {
        addressString = ethUtil.addHexPrefix(addressString)
        if (!ethUtil.isValidAddress(addressString)){
            cb(true, null);
        }
        address = ethUtil.toBuffer(addressString);
        const utxos = [];
        const start = Buffer.concat([withdrawsForAddressPrefix,
            address,
            Buffer.alloc(blockNumberLength), 
            Buffer.alloc(txNumberLength)])
        const stop = Buffer.concat([withdrawsForAddressPrefix,
            address,
            Buffer.from("ff".repeat(blockNumberLength), 'hex'), 
            Buffer.from("ff".repeat(txNumberLength), 'hex'),])
        const sliceStart = withdrawsForAddressPrefix.length + address.length;
        levelDB.createReadStream({gte: start,
                                    lte: stop,
                                    reversed:true})
        .on('data', function (data) {
            toReturn = {};
            toReturn["blockNumber"] = ethUtil.bufferToInt(data.key.slice(sliceStart, sliceStart + blockNumberLength))
            toReturn["txNumberInBlock"] = ethUtil.bufferToInt(data.key.slice(sliceStart + blockNumberLength, sliceStart + blockNumberLength + txNumberLength))
            utxos.push(toReturn);
        })
        .on('error', function (err) {
            console.log('Oh my!', err)
            cb(err, null)
        })
        .on('close', function () {
            // cb(null, utxos)
            // console.log('Stream closed')
        })
        .on('end', function () {
            cb(null, utxos)
            // console.log('Stream ended')
        })
    }
}
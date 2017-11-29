const config = require("../config/config");
const ethUtil = require('ethereumjs-util'); 
const blockPrefix = config.blockPrefix;
const utxoIncludingAddressPrefix = config.utxoIncludingAddressPrefix;
const utxoPrefix = config.utxoPrefix;
const makeAddressIndex = config.makeAddressIndex;
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

    if (makeAddressIndex) {
        return getUTXOforAddressWithIndex;
    } else {
        return getUTXOforAddress;
    }

    async function getUTXOforAddress(addressString, cb) {
        addressString = ethUtil.addHexPrefix(addressString)
        assert(ethUtil.isValidAddress(addressString));
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
            console.log('Stream closed')
        })
        .on('end', function () {
            cb(null, utxos)
            console.log('Stream ended')
        })
    }

    async function getUTXOforAddressWithIndex(addressString, cb) {
        addressString = ethUtil.addHexPrefix(addressString)
        assert(ethUtil.isValidAddress(addressString));
        address = ethUtil.toBuffer(addressString);
        const utxos = [];
        const start = Buffer.concat([utxoIncludingAddressPrefix,
            Buffer.alloc(blockNumberLength), 
            Buffer.alloc(txNumberLength), 
            Buffer.alloc(txOutputNumberLength)])
        const stop = Buffer.concat([utxoIncludingAddressPrefix,
            Buffer.from("ff".repeat(blockNumberLength), 'hex'), 
            Buffer.from("ff".repeat(txNumberLength), 'hex'),
            Buffer.from("ff".repeat(txOutputNumberLength), 'hex')])
        const sliceStart = utxoIncludingAddressPrefix.length;
        levelDB.createReadStream({gte: start,
                                    lte: stop,
                                    reversed:true})
        .on('data', function (data) {
            const out = TransactionOutput.prototype.initFromBinaryBlob(data.value);
            toReturn = {};
            toReturn["blockNumber"] = ethUtil.bufferToInt(data.key.slice(sliceStart, sliceStart + blockNumberLength))
            toReturn["txNumberInBlock"] = ethUtil.bufferToInt(data.key.slice(sliceStart + blockNumberLength, sliceStart + blockNumberLength + txNumberLength))
            toReturn['output'] = out;
            utxos.push(toReturn);
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
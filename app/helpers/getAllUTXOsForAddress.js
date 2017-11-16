const config = require("../config/config");
const ethUtil = require('ethereumjs-util'); 
const blockPrefix = config.blockPrefix;
const utxoIncludingAddressPrefix = config.utxoIncludingAddressPrefix;
const utxoPrefix = config.utxoPrefix;
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

    return async function getUTXOforAddress(addressString, cb) {
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
        levelDB.createReadStream({gte: start,
                                    lte: stop,
                                    reversed:true})
        .on('data', function (data) {
            if (data.value.slice(0,txToAddressLength).equals(address)) {
                const out = TransactionOutput.prototype.initFromBinaryBlob(data.value);
                toReturn = {};
                toReturn["blockNumber"] = ethUtil.bufferToInt(data.key.slice(utxoPrefix.length, utxoPrefix.length + blockNumberLength))
                toReturn["txNumberInBlock"] = ethUtil.bufferToInt(data.key.slice(utxoPrefix.length + blockNumberLength, utxoPrefix.length + blockNumberLength + txNumberLength))
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
}
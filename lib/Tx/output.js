'use strict'
const ethUtil = require('ethereumjs-util')
const BN = ethUtil.BN
const defineProperties = require('../serialize').defineProperties;
// secp256k1n/2
const N_DIV_2 = new BN('7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0', 16)

class TransactionOutput {
  constructor (data) {
    data = data || {}
    // Define Properties
    const fields = [{
        name: 'to',
        allowZero: true,
        alias: 'recipient',
        length: 20,
        allowLess: false,
        default: Buffer.alloc(20)
        }, 
        // {
        // name: 'assetID',
        // allowZero: true,
        // alias: 'asset',
        // length: 4,
        // allowLess: false,
        // default: Buffer.alloc(4)
        // }, 
        {
        name: 'outputNumberInTransaction',
        allowZero: true,
        alias: 'outputNum',
        length: 1,
        allowLess: false,
        default: Buffer.alloc(1)
        },
        {
        name: 'amountBuffer',
        allowZero: true,
        alias: 'valueBuffer',
        length: 32,
        allowLess: false,
        default: Buffer.alloc(32)
        }]

        defineProperties(this, fields, data)

    /**
     * @property {BigNumber} from (read only) amount of this transaction, mathematically derived from other parameters.
     * @name from
     * @memberof Transaction
     */
    Object.defineProperty(this, 'value', {
        enumerable: true,
        configurable: true,
        get: (() => new BN(this.valueBuffer)) 
    })

    Object.defineProperty(this, 'length', {
        enumerable: true,
        configurable: true,
        get: (() =>  Buffer.concat(this.raw).length) 
    })
  }
  getKey() {
    if(this._key) {
        return this._key;
    }
    this._key = Buffer.concat(this.raw.slice(0,2)).toString('hex')
    return this._key;
}
}



const dummy = new TransactionOutput();
const TransactionOutputLength = dummy.length;

TransactionOutput.prototype.initFromBinaryBlob = function(blob) {
    if (!blob || blob.length != TransactionOutputLength) {
        return null;
    }
    // const split = [blob.slice(0,20), blob.slice(20,24), blob.slice(24,25), blob.slice(25,57)];
    const split = [blob.slice(0,20), blob.slice(20,21), blob.slice(21,53)];
    const output = new TransactionOutput(split);
    return output
}



module.exports = function(){
    return {TransactionOutput, TransactionOutputLength}}()
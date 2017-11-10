'use strict'
const ethUtil = require('ethereumjs-util')
const BN = ethUtil.BN
const defineProperties = require('../serialize').defineProperties;
// secp256k1n/2
const N_DIV_2 = new BN('7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0', 16)

class TransactionInput {
  constructor (data) {
    data = data || {}
    // Define Properties
    const fields = [{
      name: 'blockNumber',
      alias: 'block',
      allowZero: true,
      length: 4,
      allowLess: false,
      default: Buffer.alloc(4)
    }, {
      name: 'txNumberInBlock',
      allowZero: true,
      alias: 'txNum',
      length: 2,
      allowLess: false,
      default: Buffer.alloc(2)
    }, {
      name: 'outputNumberInTransaction',
      allowZero: true,
      alias: 'outputNum',
      length: 1,
      allowLess: false,
      default: Buffer.alloc(1)
    }, 
    // {
    //   name: 'assetID',
    //   allowZero: true,
    //   alias: 'asset',
    //   length: 4,
    //   allowLess: false,
    //   default: Buffer.alloc(4)
    // }, 
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
        get: (() => Buffer.concat(this.raw).length) 
    })
  }
  getKey() {
    if(this._key) {
      return this._key;
    }
    this._key = Buffer.concat(this.raw.slice(0,3)).toString('hex')
    return this._key;
  }
}



const dummy = new TransactionInput();
const TransactionInputLength = dummy.length;

TransactionInput.prototype.initFromBinaryBlob = function(blob) {
  if (!blob || blob.length != TransactionInputLength) {
    return null;
  }
  // const split = [blob.slice(0,4), blob.slice(4,6), blob.slice(6,7), blob.slice(7,9), blob.slice(9, 13), blob.slice(13,47)];
  const split = [blob.slice(0,4), blob.slice(4,6), blob.slice(6,7), blob.slice(7,39)];
  const input = new TransactionInput(split);
  return input;
}



module.exports = {TransactionInput, TransactionInputLength}
const {blockNumberLength,
txNumberLength,
txTypeLength, 
signatureVlength,
signatureRlength,
signatureSlength,
merkleRootLength,
previousHashLength,
txOutputNumberLength,
txAmountLength} = require('../dataStructureLengths');

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
      length: blockNumberLength,
      allowLess: false,
      default: Buffer.alloc(blockNumberLength)
    }, {
      name: 'txNumberInBlock',
      allowZero: true,
      alias: 'txNum',
      length: txNumberLength,
      allowLess: false,
      default: Buffer.alloc(txNumberLength)
    }, {
      name: 'outputNumberInTransaction',
      allowZero: true,
      alias: 'outputNum',
      length: txOutputNumberLength,
      allowLess: false,
      default: Buffer.alloc(txOutputNumberLength)
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
      length: txAmountLength,
      allowLess: false,
      default: Buffer.alloc(txAmountLength)
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

  toFullJSON(labeled) {
    if (labeled) {
      const blockNumber = ethUtil.bufferToInt(this.blockNumber)
      const txNumberInBlock = ethUtil.bufferToInt(this.txNumberInBlock)
      const outputNumberInTransaction = ethUtil.bufferToInt(this.outputNumberInTransaction)
      const value = this.value.toString(10);
      const obj = {
        blockNumber,
        txNumberInBlock,
        outputNumberInTransaction : outputNumberInTransaction,
        value
      }
      return obj;
    } else {
      return ethUtil.baToJSON(this.raw)
    }
  }
}



const dummy = new TransactionInput();
const TransactionInputLength = dummy.length;

TransactionInput.prototype.initFromBinaryBlob = function(blob) {
  if (!blob || blob.length != TransactionInputLength) {
    return null;
  }
  const split = [];
  let i=0;
  for (let sliceLen of [blockNumberLength, txNumberLength, txOutputNumberLength, txAmountLength]) {
    split.push(blob.slice(i, i + sliceLen));
    i += sliceLen;
  }
  const input = new TransactionInput(split);
  return input;
}



module.exports = {TransactionInput, TransactionInputLength}
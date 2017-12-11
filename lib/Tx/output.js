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
    txToAddressLength} = require('../dataStructureLengths');

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
        length: txToAddressLength,
        allowLess: false,
        default: Buffer.alloc(txToAddressLength)
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
        length: txOutputNumberLength,
        allowLess: false,
        default: Buffer.alloc(txOutputNumberLength)
        },
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

    toFullJSON(labeled) {
        if (labeled) {
            let to = ethUtil.bufferToHex(this.to)
            to = ethUtil.toChecksumAddress(to)
            const outputNumberInTransaction = ethUtil.bufferToInt(this.outputNumberInTransaction)
            const value = this.value.toString(10);
            const obj = {
              to,
              outputNumberInTransaction,
              value
            }
            return obj;
        } else {
          return ethUtil.baToJSON(this.raw)
        }
      }
}



const dummy = new TransactionOutput();
const TransactionOutputLength = dummy.length;

TransactionOutput.prototype.initFromBinaryBlob = function(blob) {
    if (!blob || blob.length != TransactionOutputLength) {
        return null;
    }
    const split = [];
    let i=0;
    for (let sliceLen of [txToAddressLength, txOutputNumberLength, txAmountLength]) {
        split.push(blob.slice(i, i+ sliceLen));
        i += sliceLen;
    }
    const output = new TransactionOutput(split);
    return output
}



module.exports = function(){
    return {TransactionOutput, TransactionOutputLength}}()
const {blockNumberLength,
  txNumberLength,
  txTypeLength, 
  signatureVlength,
  signatureRlength,
  signatureSlength,
  merkleRootLength,
  previousHashLength} = require('../dataStructureLengths');

const stripHexPrefix = require('strip-hex-prefix');
const ethUtil = require('ethereumjs-util')
const BN = ethUtil.BN
const defineProperties = require('../serialize').defineProperties;
// secp256k1n/2
const N_DIV_2 = new BN('7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0', 16)

class BlockHeader {
  constructor (data) {
    data = data || {}
    // Define Properties
    const fields = [{
      name: 'blockNumber',
      alias: 'block',
      length: blockNumberLength,
      allowLess: false,
      default: Buffer.alloc(blockNumberLength)
    }, {
      name: 'numberOfTransactions',
      alias: 'numTX',
      length: txNumberLength,
      allowLess: false,
      default: Buffer.alloc(txNumberLength)
    }, {
      name: 'parentHash',
      allowZero: true,
      length: previousHashLength,
      allowLess: false,
      default: Buffer.alloc(previousHashLength)
    }, {
      name: 'merkleRootHash',
      allowZero: true,
      alias: 'merkle',
      length: merkleRootLength,
      allowLess: false,
      default: Buffer.alloc(merkleRootLength)
    }, {
      name: 'v',
      allowZero: true,
      length: signatureVlength,
      allowLess: false,
      default: Buffer.alloc(signatureVlength)
    }, {
      name: 'r',
      length: signatureRlength,
      allowZero: true,
      allowLess: false,
      default: Buffer.alloc(signatureRlength)
    }, {
      name: 's',
      length: signatureSlength,
      allowZero: true,
      allowLess: false,
      default: Buffer.alloc(signatureSlength)
    }]

 defineProperties(this, fields, data)

    /**
     * @property {Buffer} from (read only) sender address of this transaction, mathematically derived from other parameters.
     * @name from
     * @memberof Transaction
     */
    Object.defineProperty(this, 'from', {
      enumerable: true,
      configurable: true,
      get: this.getSenderAddress.bind(this)
    })

    Object.defineProperty(this, 'length', {
      enumerable: true,
      configurable: true,
      get: (() => Buffer.concat(this.raw).length) 
    })
  }
  /**
   * Computes a sha3-256 hash of the serialized tx
   * @param {Boolean} [includeSignature=true] whether or not to inculde the signature
   * @return {Buffer}
   */
  hash (includeSignature) {
    if (includeSignature === undefined) includeSignature = true

    // EIP155 spec:
    // when computing the hash of a transaction for purposes of signing or recovering,
    // instead of hashing only the first six elements (ie. nonce, gasprice, startgas, to, value, data),
    // hash nine elements, with v replaced by CHAIN_ID, r = 0 and s = 0

    let items = this.clearRaw(includeSignature);
    // return ethUtil.sha3(Buffer.concat(items));
    return ethUtil.hashPersonalMessage(Buffer.concat(items));

  }

  serializeSignature(signatureString) {
    const signature = stripHexPrefix(signatureString);
    let r = ethUtil.addHexPrefix(signature.substring(0,64));
    let s = ethUtil.addHexPrefix(signature.substring(64,128));
    let v = ethUtil.addHexPrefix(signature.substring(128,130));
    r = ethUtil.toBuffer(r);
    s = ethUtil.toBuffer(s);
    v = ethUtil.bufferToInt(ethUtil.toBuffer(v));
    if (v < 27) {
        v = v + 27;
    }
    v = ethUtil.toBuffer(v);
    this.r = r;
    this.v = v;
    this.s = s;
  }

  /**
   * returns the sender's address
   * @return {Buffer}
   */
  getSenderAddress () {
    if (this._from) {
      return this._from
    }
    const pubkey = this.getSenderPublicKey()
    this._from = ethUtil.publicToAddress(pubkey)
    return this._from
  }

  /**
   * returns the public key of the sender
   * @return {Buffer}
   */
  getSenderPublicKey () {
    if (!this._senderPubKey || !this._senderPubKey.length) {
      if (!this.verifySignature()) throw new Error('Invalid Signature')
    }
    return this._senderPubKey
  }

  /**
   * Determines if the signature is vali
   * d
   * @return {Boolean}
   */
  verifySignature () {
    const msgHash = this.hash(false)
    // All transaction signatures whose s-value is greater than secp256k1n/2 are considered invalid.
    if (new BN(this.s).cmp(N_DIV_2) === 1) {
      return false
    }
    try {
      let v = ethUtil.bufferToInt(this.v)
    //   if (this._chainId > 0) {
    //     v -= this._chainId * 2 + 8
    //   }
      this._senderPubKey = ethUtil.ecrecover(msgHash, v, this.r, this.s)
    } catch (e) {
      return false
    }

    return !!this._senderPubKey
  }

  /**
   * sign a transaction with a given a private key
   * @param {Buffer} privateKey
   */
  sign (privateKey) {
    const msgHash = this.hash(false)
    const sig = ethUtil.ecsign(msgHash, privateKey)
    if (sig.v < 27){
        sig.v += 27
    }
 
    Object.assign(this, sig)
  }


  clearRaw(includeSignature) {
    let items
    if (includeSignature) {
      items = this.raw
    } else {
        items = this.raw.slice(0, this.raw.length-3)
    }
    return items;
    // return Buffer.concat(items);
  }

  /**
   * validates the signature and checks to see if it has enough gas
   * @param {Boolean} [stringError=false] whether to return a string with a dscription of why the validation failed or return a Bloolean
   * @return {Boolean|String}
   */
  validate (stringError) {
    const errors = []
    if (!this.verifySignature()) {
      errors.push('Invalid Signature')
    }
    if (stringError === undefined || stringError === false) {
      return errors.length === 0
    } else {
      return errors.join(' ')
    }
  }

  toFullJSON(labeled) {
    if (labeled) {
      const header = this.toJSON(labeled);
      const blockNumber = ethUtil.bufferToInt(this.blockNumber)
      const numberOfTransactions = ethUtil.bufferToInt(this.numberOfTransactions)
      header.blockNumber = blockNumber
      header.numberOfTransactions = numberOfTransactions
      return header
    } else {
      return ethUtil.baToJSON(this.raw)
    }
  }
}

const dummy = new BlockHeader();
const BlockHeaderLength = dummy.length;
const BlockHeaderNumItems = dummy.raw.length;

module.exports = {BlockHeader, BlockHeaderLength, BlockHeaderNumItems}


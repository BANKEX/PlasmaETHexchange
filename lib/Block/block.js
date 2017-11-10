const ethUtil = require('ethereumjs-util');
const BN = ethUtil.BN
const {PlasmaTransaction,
    TxTypeFund, 
    TxTypeMerge, 
    TxTypeSplit, 
    TxTypeWithdraw, 
    TxLengthForType} = require('../Tx/tx');
const MerkleTools = require('../merkle-tools');
const {BlockHeader, BlockHeaderLength} = require('./blockHeader'); 
const assert = require('assert');

// secp256k1n/2
const N_DIV_2 = new BN('7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0', 16);

class Block {
  constructor (data) {
    if (data instanceof Object && data.constructor === Object ){ 
        this.blockNumber = data.blockNumber || Buffer.alloc(4);
        this.parentHash = data.parentHash || Buffer.alloc(32);
        this.transactions = data.transactions || [];
        this.numberOfTransactions = data.transactions.length || 0;
        const numberOfTransactionsBuffer = Buffer.alloc(2);
        numberOfTransactionsBuffer.writeUInt16BE(this.numberOfTransactions);
        assert(this.transactions && Array.isArray(this.transactions), "TXs should be an array");
        const treeOptions = {
            hashType: 'sha3'
        }
        
        this.merkleTree = new MerkleTools(treeOptions)
        for (var i = 0; i < this.transactions.length; i++) {
            this.merkleTree.addLeaf(this.transactions[i].hash(true, true));
        }  
        assert (this.merkleTree.getLeafCount() == this.numberOfTransactions);
        this.merkleTree.makeTree(false);
        const rootValue = this.merkleTree.getMerkleRoot();
        // console.log(this.merkleTree.getProof(4) )
        const headerParams = {
            blockNumber: this.blockNumber,
            parentHash: this.parentHash,
            merkleRootHash: rootValue,
            numberOfTransactions: numberOfTransactionsBuffer
        }
        this.header = new BlockHeader(headerParams);
    } else if (Buffer.isBuffer(data)) {
        this.transactions = [];
        const head = data.slice(0, BlockHeaderLength);
        const headerArray = [head.slice(0,4), head.slice(4,6), head.slice(6,38), head.slice(38,70), head.slice(70,71), head.slice(71,103), head.slice(103,135) ]
        this.header = new BlockHeader(headerArray);
        let transactionsBuffer = data.slice(BlockHeaderLength, data.length);
        while (transactionsBuffer.length > 0) {
            const txType = transactionsBuffer.slice(2,3).readUInt8(0);
            const txBin = transactionsBuffer.slice(0, TxLengthForType[txType]);
            const TX = PlasmaTransaction.prototype.initTxForTypeFromBinary(txType, txBin);
            this.transactions.push(TX);
            transactionsBuffer = transactionsBuffer.slice(TxLengthForType[txType], transactionsBuffer.length);
        }
        assert(this.transactions.length == head.slice(4,6).readUInt16BE(0));
        const treeOptions = {
            hashType: 'sha3'
          }
        this.merkleTree = new MerkleTools(treeOptions)
        for (var i = 0; i < this.transactions.length; i++) {
            this.merkleTree.addLeaf(this.transactions[i].hash(true, true));
        }  
        assert(this.merkleTree.getLeafCount() == head.slice(4,6).readUInt16BE(0));
        this.merkleTree.makeTree(false);
        const rootValue = this.merkleTree.getMerkleRoot();
        assert(rootValue.equals(this.header.merkleRootHash))
        assert(this.header.validate());
        // console.log(this.merkleTree.getProof(4) )
    }
    Object.defineProperty(this, 'from', {
      enumerable: true,
      configurable: true,
      get: this.getSenderAddress.bind(this)
    })

    Object.defineProperty(this, 'raw', {
        get: function () {
        return this.serialize(false)
        }
    })
    
}

   
serialize(includeSignature) {
    var txRaws = [];
    this.transactions.forEach((tx) => {
        const r = tx.raw.filter((f) => {
            return (typeof f !== 'undefined')
        })
        txRaws.push(Buffer.concat(r))
    })
    return this.header.raw.concat(txRaws);
}  



  /**
   * Computes a sha3-256 hash of the serialized tx
   * @param {Boolean} [includeSignature=true] whether or not to inculde the signature
   * @return {Buffer}
   */
  hash (includeSignature) {
      return this.header.hash(includeSignature)
  }

  /**
   * returns the sender's address
   * @return {Buffer}
   */
  getSenderAddress () {
      return this.header.getSenderAddress()
  }

  /**
   * returns the public key of the sender
   * @return {Buffer}
   */
  getSenderPublicKey () {
      return this.header._senderPubKey
  }

  getMerkleHash () {
    return this.header.merkleRootHash;
  }

  /**
   * Determines if the signature is valid
   * @return {Boolean}
   */
  verifySignature () {
      return this.header.verifySignature()
  }

  /**
   * sign a transaction with a given a private key
   * @param {Buffer} privateKey
   */
  sign (privateKey) {
      this.header.sign(privateKey)
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

}

Block.prototype.toJSON = function (labeled) {
    if (labeled) {
      var obj = {
        header: this.header.toJSON(labeled),
        transactions: []
      }
  
      this.transactions.forEach(function (tx) {
        const txJSON = tx.toFullJSON(labeled)
        obj.transactions.push(txJSON);
      })
  
      return obj
    } else {
      return ethUtil.baToJSON(this.raw)
    }
  }

module.exports = Block
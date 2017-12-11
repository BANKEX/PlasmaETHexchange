const {blockNumberLength,
    txNumberLength,
    txTypeLength, 
    signatureVlength,
    signatureRlength,
    signatureSlength,
    merkleRootLength,
    previousHashLength} = require('../dataStructureLengths');

const ethUtil = require('ethereumjs-util');
const BN = ethUtil.BN
const {PlasmaTransaction,
    TxTypeFund, 
    TxTypeMerge, 
    TxTypeSplit, 
    TxTypeWithdraw, 
    TxTypeTransfer,
    TxLengthForType} = require('../Tx/tx');
const MerkleTools = require('../merkle-tools');
const {BlockHeader, BlockHeaderLength, BlockHeaderNumItems} = require('./blockHeader'); 
const assert = require('assert');
const stripHexPrefix = require('strip-hex-prefix');

// secp256k1n/2
const N_DIV_2 = new BN('7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0', 16);

class Block {
  constructor (data) {
    if (data instanceof Object && data.constructor === Object ){ 
        this.blockNumber = data.blockNumber || Buffer.alloc(blockNumberLength);
        this.parentHash = data.parentHash || Buffer.alloc(previousHashLength);
        this.transactions = data.transactions || [];
        this.numberOfTransactions = data.transactions.length || 0;
        const numberOfTransactionsBuffer = ethUtil.setLengthLeft(ethUtil.toBuffer(this.numberOfTransactions), txNumberLength);

        assert(this.transactions && Array.isArray(this.transactions), "TXs should be an array");
        const treeOptions = {
            hashType: 'sha3'
        }
        
        this.merkleTree = new MerkleTools(treeOptions)
        for (let i = 0; i < this.transactions.length; i++) {
            const tx = this.transactions[i];
            const txHash = tx.hash(true, true);
            // console.log("Added tx hash " + ethUtil.bufferToHex(txHash));
            // console.log("TX with content " + ethUtil.bufferToHex(Buffer.concat(tx.clearRaw(true, true))));
            this.merkleTree.addLeaf(txHash);
        }  
        assert (this.merkleTree.getLeafCount() == this.numberOfTransactions);
        this.merkleTree.makeTree(false);
        const rootValue = this.merkleTree.getMerkleRoot();
        // console.log("Merkle root of block is " + ethUtil.bufferToHex(rootValue));
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
        let i = 0;
        const headerArray = [];
        for (let sliceLen of [blockNumberLength, txNumberLength, previousHashLength, merkleRootLength, signatureVlength, signatureRlength, signatureSlength]) {
            headerArray.push(head.slice(i, i + sliceLen));
            i += sliceLen;
        }
        this.header = new BlockHeader(headerArray);
        let transactionsBuffer = data.slice(BlockHeaderLength, data.length);
        while (transactionsBuffer.length > 0) {
            const txType = ethUtil.bufferToInt(transactionsBuffer.slice(txNumberLength,txNumberLength + txTypeLength))
            const txBin = transactionsBuffer.slice(0, TxLengthForType[txType]);
            const TX = PlasmaTransaction.prototype.initTxForTypeFromBinary(txType, txBin);
            this.transactions.push(TX);
            transactionsBuffer = transactionsBuffer.slice(TxLengthForType[txType], transactionsBuffer.length);
        }
        assert(this.transactions.length == ethUtil.bufferToInt(head.slice(blockNumberLength,blockNumberLength+txNumberLength)));
        const treeOptions = {
            hashType: 'sha3'
          }
        this.merkleTree = new MerkleTools(treeOptions)
        for (let j = 0; j < this.transactions.length; j++) {
            const tx = this.transactions[j];
            const txHash = tx.hash(true, true);
            // console.log("Added tx hash " + ethUtil.bufferToHex(txHash));
            // console.log("TX with content " + ethUtil.bufferToHex(Buffer.concat(tx.clearRaw(true, true))));
            this.merkleTree.addLeaf(txHash);
        }  
        assert(this.merkleTree.getLeafCount() == ethUtil.bufferToInt(head.slice(blockNumberLength,blockNumberLength+txNumberLength)));
        this.merkleTree.makeTree(false);
        const rootValue = this.merkleTree.getMerkleRoot();
        assert(rootValue.equals(this.header.merkleRootHash))
        assert(this.header.validate());
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

serializeSignature(signatureString) {
    this.header.serializeSignature(signatureString);
    const signature = stripHexPrefix(signatureString);
  }
   
serialize(includeSignature) {
    var txRaws = [];
    this.transactions.forEach((tx) => {
        const r = tx.clearRaw(true, true);
        // const r = tx.raw.filter((f) => {
        //     return (typeof f !== 'undefined')
        // })
        txRaws.push(Buffer.concat(r))
    })
    return this.header.raw.concat(txRaws);
}  

clearRaw(includeSignature) {
    return this.header.clearRaw(includeSignature);
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
        const txJSON = tx.toJSON(labeled)
        obj.transactions.push(txJSON);
      })
  
      return obj
    } else {
      return ethUtil.baToJSON(this.raw)
    }
  }

Block.prototype.toFullJSON = function (labeled) {
    if (labeled) {
      var obj = {
        header: this.header.toFullJSON(labeled),
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
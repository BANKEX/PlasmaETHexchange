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

const TxTypeSplit = 1;
const TxTypeMerge = 2;
const TxTypeWithdraw = 3;
const TxTypeFund = 4;
const TxTypeTransfer = 5;

// secp256k1n/2
const N_DIV_2 = new BN('7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0', 16)

const {TransactionInput, TransactionInputLength} = require("./input");
const {TransactionOutput, TransactionOutputLength} = require("./output");

const config = require("../../app/config/config");
const plasmaOperatorAddress = config.plasmaOperatorAddress;

class PlasmaTransaction {
  constructor (data) {
    data = data || {}
    // Define Properties
    const fields = [
    {
      name: 'transactionNumberInBlock',
      length: txNumberLength,
      allowLess: false,
      allowZero: true,
      default: Buffer.alloc(txNumberLength)
    }, {
      name: 'transactionType',
      alias: 'txType',
      length: txTypeLength,
      allowLess: false,
      allowZero: true,
      default: Buffer.alloc(txTypeLength)
    }, {
      name: 'inputNum0',
      alias: 'input0',
      length: TransactionInputLength,
      allowLess: false
    }, {
      name: 'inputNum1',
      alias: 'input1',
      length: TransactionInputLength,
      allowLess: false
    }, {
      name: 'outputNum0',
      alias: 'output0',
      length: TransactionOutputLength,
      allowLess: false
    }, {
      name: 'outputNum1',
      alias: 'output1',
      length: TransactionOutputLength,
      allowLess: false
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
    this._inputs = {};
    this._outputs = {};
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
  }

  /**
   * If the tx's `to` is to the creation address
   * @return {Boolean}
   */
  toWithdrawAddress () {
    return this.output1.toString('hex') === ''
  }

    /**
   * If the tx's `from` is from the creation address
   * @return {Boolean}
   */
  fromFundingAddress () {
    return this.input1.toString('hex') === ''
  }

  /**
   * Computes a sha3-256 hash of the serialized tx
   * @param {Boolean} [includeSignature=true] whether or not to inculde the signature
   * @return {Buffer}
   */
  hash (includeSignature, includeNumber) {
    if (includeSignature === undefined) includeSignature = true
    if (includeNumber === undefined) includeNumber = false
    // EIP155 spec:
    // when computing the hash of a transaction for purposes of signing or recovering,
    // instead of hashing only the first six elements (ie. nonce, gasprice, startgas, to, value, data),
    // hash nine elements, with v replaced by CHAIN_ID, r = 0 and s = 0

    let items
    let start = 0;
    if (!includeNumber) {
      start = 1;
    }
    if (includeSignature) {
      items = this.raw.slice(start, this.raw.length)
    } else {
        items = this.raw.slice(start, this.raw.length-3)
    }
    items = items.filter((i) =>{
      return typeof i !== 'undefined';
    })
    return ethUtil.hashPersonalMessage(Buffer.concat(items));

  }


  getTransactionInput(inputNumber) {
      if (this._inputs[inputNumber]) {
        return this._inputs[inputNumber]
      }
      this._inputs[inputNumber] = TransactionInput.prototype.initFromBinaryBlob(this["inputNum"+inputNumber]);
      return this._inputs[inputNumber]
  }

  getTransactionOutput(outputNumber) {
      if (this._outputs[outputNumber]) {
        return this._outputs[outputNumber]
      }
      this._outputs[outputNumber] = TransactionOutput.prototype.initFromBinaryBlob(this["outputNum"+outputNumber]);
      return this._outputs[outputNumber]
  }

  getKey() {
    if(this._key) {
      return this._key;
    }
    this._key = "";
    for (let i of [0,1]) {
        let inp = this.getTransactionInput(i);
        if (inp && typeof inp != "undefined") {
          this._key = this._key + inp.getKey();
        }
    }
    return this._key;
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
   * Determines if the signature is valid
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

  assignNumber (numberInBlock) {
    const transactionNumberInBlock = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(numberInBlock)),txNumberLength)
    Object.assign(this, transactionNumberInBlock)
  }

  transactionTypeUInt() {
    const txType = ethUtil.bufferToInt(this.transactionType)
    return txType;
  }

  /**
   * validates the signature and checks to see if it has enough gas
   * @param {Boolean} [stringError=false] whether to return a string with a dscription of why the validation failed or return a Bloolean
   * @return {Boolean|String}
   */
  validate (stringError) {
    const errors = []
    for (let i of [0,1]) {
      const input = this.getTransactionInput(i);
      if (input && input.outputNumberInTransaction.equals(Buffer.from("ff", "hex")) ) {
            errors.push('Invalid Input numbers')
          }
    }
    if (this.transactionTypeUInt() == TxTypeMerge) {
      if (!this.getTransactionInput(0).to.equal(this.getTransactionInput(1))){
        errors.push('Invalid Inputs')
      }
    }
    if (this.getKey() == "000000000000000001" && this.getSenderAddress().toString('hex') != plasmaOperatorPrivKeyHex) {
      errors.push('Funding without permissions')
    }
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
      var obj = {
        txHeader: this.toJSON(labeled),
        inputs: {},
        outputs: {}
      }
      for (let i of [0,1]) {
        const inp = this.getTransactionInput(i);
        if (inp && typeof inp !== "undefined") {
          obj.inputs[i] = inp.toJSON(labeled)
        }
      }
      for (let i of [0,1]) {
        const out = this.getTransactionOutput(i);
        if (out && typeof out !== "undefined") {
          obj.outputs[i] = out.toJSON(labeled)
        }
      }
      return obj
    } else {
      return ethUtil.baToJSON(this.raw)
    }
  }
}

const dummy = new PlasmaTransaction();
const TXmainLength = Buffer.concat(dummy.raw.filter((r) =>{
  return typeof r !== "undefined"
})).length

const TxLengthForType = {};
TxLengthForType[TxTypeMerge]= TXmainLength+2*TransactionInputLength + 1*TransactionOutputLength
TxLengthForType[TxTypeSplit]= TXmainLength+1*TransactionInputLength + 2*TransactionOutputLength
TxLengthForType[TxTypeWithdraw]= TXmainLength+1*TransactionInputLength + 1*TransactionOutputLength
TxLengthForType[TxTypeFund]= TXmainLength+1*TransactionInputLength + 2*TransactionOutputLength
TxLengthForType[TxTypeTransfer]= TXmainLength+1*TransactionInputLength + 1*TransactionOutputLength

PlasmaTransaction.prototype.initTxForTypeFromBinary = function(txType, blob) {
  const numInputs = NumInputsForType[txType];
  const numOutputs = NumOutputsForType[txType];
  if (numInputs == undefined || numOutputs == undefined) {
    return null;
  }
  const splitFront = [];
  let i=0;
  for (let sliceLen of [txNumberLength, txTypeLength]) {
    splitFront.push(blob.slice(i, i+ sliceLen));
    i += sliceLen;
  }
  const txParams = {};
  for (let j = 0; j < numInputs; j++){
    const input = TransactionInput.prototype.initFromBinaryBlob(blob.slice(i, i+TransactionInputLength));
    i+= TransactionInputLength;
    txParams["inputNum"+j] = Buffer.concat(input.raw);
  }
  for (let j = 0; j < numOutputs; j++){
    const output = TransactionOutput.prototype.initFromBinaryBlob(blob.slice(i, i+TransactionOutputLength));
    i+= TransactionOutputLength;
    txParams["outputNum"+j] = Buffer.concat(output.raw);
  }
  const splitEnd = [];
  for (let sliceLen of [signatureVlength, signatureRlength, signatureSlength]) {
    splitEnd.push(blob.slice(i, i+ sliceLen));
    i += sliceLen;
  }
  txParams['transactionNumberInBlock'] = splitFront[0];
  txParams['transactionType'] = splitFront[1];
  txParams['v'] = splitEnd[0];
  txParams['r'] = splitEnd[1];
  txParams['s'] = splitEnd[2];
  const TX = new PlasmaTransaction(txParams);
  return TX;
}



const NumInputsForType = {}
NumInputsForType[TxTypeFund] =  1
NumInputsForType[TxTypeWithdraw]= 1
NumInputsForType[TxTypeMerge]= 2
NumInputsForType[TxTypeSplit]= 1
NumInputsForType[TxTypeTransfer] = 1

const NumOutputsForType = {}
NumOutputsForType[TxTypeFund]= 2
NumOutputsForType[TxTypeWithdraw]= 1
NumOutputsForType[TxTypeMerge]= 1
NumOutputsForType[TxTypeSplit]= 2
NumOutputsForType[TxTypeTransfer] = 1

module.exports = {PlasmaTransaction,
                  TxTypeFund, 
                  TxTypeMerge, 
                  TxTypeSplit, 
                  TxTypeWithdraw,
                  TxTypeTransfer, 
                  TxLengthForType,
                  NumInputsForType,
                  NumOutputsForType}
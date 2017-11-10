const ethUtil = require('ethereumjs-util'); 

function signForECRECOVER(dataBuffer, privKeyBuffer) {
    const hash = ethUtil.hashPersonalMessage(dataBuffer);
    const signatureObject = ethUtil.ecsign(hash, privKeyBuffer);
    return {hash, signatureObject};
}

function checkSender(dataBuffer, signatureObject, address) {
    const hash = ethUtil.hashPersonalMessage(dataBuffer);
    const pubKey = ethUtil.ecrecover(hash, signatureObject.v, signatureObject.r, signatureObject.s);
    const signedFromAddress = ethUtil.publicToAddress(pubKey).toString('hex');
    return signedFromAddress == address;
}

function testSignature() {
    const data = "test";
    const dataBuffer = Buffer.from(data);
    const {hash, signatureObject} = signForECRECOVER(dataBuffer, privKeys[0]);
    const valid = checkSender(dataBuffer, signatureObject, ethUtil.privateToAddress(privKeys[0]).toString('hex'));
    assert(valid);
}

module.exports = {
    signForECRECOVER,
    checkSender,
}
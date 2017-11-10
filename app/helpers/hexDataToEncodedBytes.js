const ethUtil = require('ethereumjs-util'); 
module.exports = function convertForRemix(hexString){
    const hex = ethUtil.addHexPrefix(hexString);
    const bArray = ethUtil.toBuffer(hex);
    const encodedArray = [];
    for (var i=0; i<bArray.length; i++) {
        const b = bArray.slice(i, i+1);
        const h = ethUtil.addHexPrefix(ethUtil.bufferToHex(b));
        encodedArray.push(h);
    }
    return encodedArray;
}
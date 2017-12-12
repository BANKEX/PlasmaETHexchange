module.exports = {
    utxoPrefix : Buffer.from('utxo'),
    blockPrefix : Buffer.from('blk'),
    headerPrefix : Buffer.from('hdr'),
    transactionPrefix :Buffer.from('tx'),
    utxoIncludingAddressPrefix:Buffer.from('utxoaddr'),
    txForAddressIndexPrefix:Buffer.from('txsaddr'),
    withdrawsForAddressPrefix:Buffer.from('addrwithdraws'),
    lastEventProcessedBlockPrefix:Buffer.from('lastEthBlock'),
    lastSubmittedHeaderPrefix:Buffer.from('lastSubmHeader'),
    depositIndexPrefix:Buffer.from("deps"),
    makeAddressIndex: true,
    makeTransactionIndexForAddress : true, 
    testOnRinkeby: true,
    useSSL: true,
    get port() {
        if (this.useSSL) {
            return 443
        }
        return 8000
    },
    get provider() {
        if (this.testOnRinkeby){
            return "http://127.0.0.1:8545"
        } return "";
    },
    get deployedPlasmaContract(){
        if (this.testOnRinkeby){
            // return "0x158cb5485ea2e7fe03845d45c40c63469814bd9a"
            return ""
        } return "";
    },
    get plasmaOperatorAddress() {
        if (this.testOnRinkeby){
            return "0xe6877a4d8806e9a9f12eb2e8561ea6c1db19978d"
        } return "0x405aaaa4bdcda14a0af295f3669459b6b0fc8104";
    },
    get plasmaOperatorPassword () {
        if (this.testOnRinkeby){
            return "plasmaTest"
        } return "";
    },
    // plasmaOperatorPrivKeyHex: "0x4786e8e8cc2f7b6a5504add93505553010409a49fbc626001f2f34fd194ecfef",
    // plasmaOperatorAddress: "0x405aaaa4bdcda14a0af295f3669459b6b0fc8104",
    testAccounts: ["0xf62803ffaddda373d44b10bf6bb404909be0e66b", "0xcf78f18299eac0e0a238db7f4742ef433f98c85e"],
    testPrivKeys: [Buffer.from("7e2abf9c3bcd5c08c6d2156f0d55764602aed7b584c4e95fa01578e605d4cd32", "hex"),
    Buffer.from("0a201a3eb00242401c2d9fffefb0ed8a126281eeae98b4225fdc7265513285a2", "hex")],
    blockTime: 30000
}
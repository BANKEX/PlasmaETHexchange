module.exports = {
    utxoPrefix : Buffer.from('utxo'),
    blockPrefix : Buffer.from('blk'),
    headerPrefix : Buffer.from('hdr'),
    transactionPrefix :Buffer.from('tx'),
    utxoIncludingAddressPrefix:Buffer.from('utxoaddr'),
    makeAddressIndex: true,
    deployedPlasmaContract: "",
    deployedPlasmaOperatorAddress: "0xe6877a4d8806e9a9f12eb2e8561ea6c1db19978d",
    deployedPlasmaOperatorPassword: "plasmaTest",
    plasmaOperatorPrivKeyHex: "0x4786e8e8cc2f7b6a5504add93505553010409a49fbc626001f2f34fd194ecfef",
    plasmaOperatorAddress: "0x405aaaa4bdcda14a0af295f3669459b6b0fc8104",
    testAccounts: ["0xf62803ffaddda373d44b10bf6bb404909be0e66b", "0xcf78f18299eac0e0a238db7f4742ef433f98c85e"],
    testPrivKeys: [Buffer.from("7e2abf9c3bcd5c08c6d2156f0d55764602aed7b584c4e95fa01578e605d4cd32", "hex"),
    Buffer.from("0a201a3eb00242401c2d9fffefb0ed8a126281eeae98b4225fdc7265513285a2", "hex")],
    blockTime: 10000
}
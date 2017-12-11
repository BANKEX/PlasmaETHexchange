const Web3 = require('web3');
const ethUtil = require('ethereumjs-util'); 
const assert = require('assert')

module.exports = function(app, levelDB, web3) {
    const getWithdrawsforAddress = require('../helpers/getAllWithdrawsForAddress')(levelDB);
    app.get('/withdraws/:address', 'getWithdrawssByAddress', async function(req, res, next) {
        try{ 
            addressString = req.params.address
            assert(ethUtil.isValidAddress(addressString))
            addressString = ethUtil.addHexPrefix(addressString)
            getWithdrawsforAddress(addressString, function(err, txs) {
                if (err){
                    console.log(err)
                    res.json({error: true, reason: "invalid address"});
                    next()
                }
                res.json({error: false, address: addressString, txs})
                next()
                return
            })
        }
        catch(error) {
            res.json({error: true, reason: "invalid address"});
            next()
        }
    });
}
const Web3 = require('web3');
module.exports = function(app, levelDB, web3) {
    app.post('/sendPlasmaTransaction', 'sendPlasmaTransaction', async function(req, res){
        try{ 
            const {blockNumber, txInBlock, assetId, to, v, r, s} = req.body
            if (!blockNumber || !txInBlock || !assetId || !to || !v || !r || !s) {
                return res.json({error: true, reason: "invalid transation"});
                // next()
            }
            const tx = new PlasmaTransaction({blockNumber, txInBlock, assetId, to, v, r, s})
            if (!tx.validate()){
                return res.json({error: true, reason: "invalid transation"});
            }
            var unspentTxRaw
            try{
                const keyForUtxo = Buffer.concat([utxoPrefix, tx.blockNumber, tx.txInBlock]);
                unspentTxRaw = await levelDB.get(keyForUtxo);
            } 
            catch(err){
                return res.json({error: true, reason: "invalid transation"});
            }
            const unspentTx = new PlasmaTransaction(sliceRawBufferForTx(unspentTxRaw))
            if (!unspentTx.validate()){
                return res.json({error: true, reason: "invalid transation"});
            }
            if (!unspentTx.to.equals(tx.getSenderAddress())){
                return res.json({error: true, reason: "invalid transation"});
            }
            txParamsFIFO.push(tx);
            console.log("Pushed new TX")
            return res.json({error: false, status: "accepted"});
        }
        catch(error){
            res.json({error: true, reason: "invalid transation"});
    
        }
    })
}
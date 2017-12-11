const Web3 = require('web3');
module.exports = function(app, levelDB, web3) {
    const getTX = require('../helpers/getTX')(levelDB);
    app.get('/plasmaTX/:blockNumber/:txNumberInBlock', 'getBlockByNumber', async function(req, res){
        try{ 
            const blockNumber = parseInt(req.params.blockNumber);
            const txNumberInBlock = parseInt(req.params.txNumberInBlock);
            if (blockNumber == undefined || txNumberInBlock == undefined){
                return res.json({error: true, reason: "invalid transaction number"});
            }
            let tx = await getTX(blockNumber, txNumberInBlock);
            tx = tx.toFullJSON(true)
            tx.header['blockNumber'] = blockNumber;
            return res.json(tx)
        }
        catch(error){
            return res.json({error: true, reason: "invalid block number"});
        }
    });
}
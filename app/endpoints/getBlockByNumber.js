const Web3 = require('web3');
module.exports = function(app, levelDB, web3) {
    const getBlockByNumber = require('../helpers/getBlock')(levelDB);
    app.get('/plasmaBlock/:id', 'getBlockByNumber', async function(req, res){
        try{ 
            const blockNumber = parseInt(req.params.id);
            if (!blockNumber){
                return res.json({error: true, reason: "invalid block number"});
            }
            const block = await getBlockByNumber(blockNumber);
            return res.json(block.toFullJSON(true))
        }
        catch(error){
            return res.json({error: true, reason: "invalid block number"});
        }
    });
}
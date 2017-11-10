const express        = require('express');
var rimraf = require('rimraf');
rimraf.sync('./db');
console.log("Cleared DB");
var Router = require('named-routes');
const app            = express();
var router = new Router();
router.extendExpress(app);
router.registerAppHelpers(app);
const comp = require('./compile');
const bodyParser = require('body-parser');
 
const assert = require('assert');
const moment = require('moment');
const coinstring = require('coinstring');
const fs = require("fs");
const solc = require('solc');
const Artifactor = require("truffle-artifactor"); 
const async = require("async");
const TruffleContract = require('truffle-contract');
 
var TestRPC = require("ethereumjs-testrpc");
 
const Web3 = require("web3");
const util = require('util');
var ethUtil = require('ethereumjs-util'); 
const PlasmaTransaction = require('./lib/Tx/tx');
const Block = require('./lib/Block/block');
const fromBtcWif = coinstring.createDecoder(0x80);
const levelup = require('levelup')
const leveldown = require('leveldown')
const levelDB = levelup(leveldown('./db'))
let lastBlock;
let lastBlockHash;

let blockMiningTimer;
const config = require('./app/config/config');
// const privKeys = [fromBtcWif("5JmrM8PB2d5XetmVUCErMZYazBotNzSeMrET26WK8y3m8XLJS98"), 
//                     fromBtcWif("5HtkDncwskEM5FiBQgU1wqLLbayBmfh5FSMYtLngedr6C6NhvWr")];
// const plasmaOperatorPrivKey = fromBtcWif("5JMneDeCfBBR1M6mX7SswZvC8axrfxNgoYKtu5DqVokdBwSn2oD");
const plasmaOperatorPrivKeyHex = config.plasmaOperatorPrivKeyHex;
const plasmaOperatorPrivKey = ethUtil.toBuffer(plasmaOperatorPrivKeyHex);
const plasmaOperatorAddress = config.plasmaOperatorAddress;        
const port = 8000;
app.use(bodyParser.json());



// var web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:8545"));
var BigNumber;
var sendAsyncPromisified;
var getBlockNumberPromisified;
var getBalancePromisified;
var getAccountsPromisified;
var PlasmaContract;
var DeployedPlasmaContract;
var Web3PlasmaContract;
var allAccounts;
var web3;
function startVM(){
    var provider = TestRPC.provider({
        total_accounts: 10,
        time:new Date(),
        verbose:false,
        gasPrice: 0,
      accounts:[
          {secretKey:"0x"+fromBtcWif("5JmrM8PB2d5XetmVUCErMZYazBotNzSeMrET26WK8y3m8XLJS98").toString('hex'), balance: 4.2e18},
          {secretKey:"0x"+fromBtcWif("5HtkDncwskEM5FiBQgU1wqLLbayBmfh5FSMYtLngedr6C6NhvWr").toString('hex'), balance: 4.2e18},
          {secretKey:"0x"+fromBtcWif("5JMneDeCfBBR1M6mX7SswZvC8axrfxNgoYKtu5DqVokdBwSn2oD").toString('hex'), balance: 4.2e18}    
      ],
        mnemonic: "42"
        // ,
        // logger: console
      });
      web3 = new Web3(provider);
      BigNumber = web3.BigNumber;
      sendAsyncPromisified = util.promisify(provider.sendAsync).bind(provider);
      var tmp_func = web3.eth.getBalance;
      delete tmp_func['call'];
      getBlockNumberPromisified= util.promisify(web3.eth.getBlockNumber);
      getBalancePromisified = util.promisify(tmp_func).bind(web3.eth);
    //   DECIMAL_MULTIPLIER_BN = new BigNumber(10**SET_DECIMALS);
      getAccountsPromisified = util.promisify(web3.eth.getAccounts);
}

async function populateAccounts(){
    allAccounts = await web3.eth.getAccounts() ;
    allAccounts = allAccounts.map((a) => {
        return a.toLowerCase();
    })
    PlasmaContract = new TruffleContract(require("./build/contracts/PlasmaParent.json"));
    Web3PlasmaContract = new web3.eth.Contract(PlasmaContract.abi);
    [PlasmaContract].forEach(function(contract) {
        contract.setProvider(web3.currentProvider);
        contract.defaults({
        gas: 3.5e6,
        from: allAccounts[2]
        })
    });
}

async function deployContracts() {
    DeployedPlasmaContract = await Web3PlasmaContract.deploy({data: PlasmaContract.bytecode}).send({from: plasmaOperatorAddress, gas: 3.5e6}) ;
    DeployedPlasmaContract.events.DepositEvent(
        {
        // filter: {myIndexedParam: [20,23], myOtherIndexedParam: '0x123456789...'}, // Using an array means OR: e.g. 20 or 23
        fromBlock: 0
        // fromBlock:0, 
        // toBlock:'latest'
    })
    .on('data', function(event){
        processDepositEvent(event);
    })
    .on('changed', function(event){
        // remove event from local database
    })
    .on('error', console.error);
    console.log("Deployed at "+ DeployedPlasmaContract._address);
}


function testTx() {
    const txParams = {
        blockNumber: "0x00000001",
        txInBlock: "0x02",
        assetId: '0x00000003',
        to: '0x'+ethUtil.privateToAddress(privKeys[1]).toString('hex'), 
      }
    const tx = new PlasmaTransaction(txParams);
    const txhash = tx.hash(false).toString('hex');
    tx.sign(privKeys[0]); 
    assert(tx.validate());
    assert(tx.getSenderAddress().toString('hex') == ethUtil.privateToAddress(privKeys[0]).toString('hex'))
    return true;  
}

function createTx(params, privKeyBuffer){
    const tx = new PlasmaTransaction(params);
    tx.sign(privKeyBuffer); 
    const arrayRepr = tx.toJSON();
    return {
        blockNumber: arrayRepr[0],
        txInBlock: arrayRepr[1],
        assetId: arrayRepr[2],
        to: arrayRepr[3],
        v: arrayRepr[4],
        r: arrayRepr[5],
        s: arrayRepr[6] 
    }
}



// testTx();

function testBlock() {
    const txParams = {
        blockNumber: "0x00000001",
        txInBlock: "0x02",
        assetId: '0x00000003',
        to: '0x'+ethUtil.privateToAddress(privKeys[1]).toString('hex'), 
      }
    var TXs = [];
    for (let i=0; i< 42; i++) {  
        const tx = new PlasmaTransaction(txParams);
        tx.sign(privKeys[0]); 
        TXs.push(tx);
    }
    const blockParams = {
        blockNumber: "0x00000001",
        parentHash: Buffer.alloc(32),
        transactions: TXs
    }
    const block = new Block(blockParams); 
    block.sign(privKeys[0]);
    console.log(block.toJSON())
    assert(block.validate());
    assert(block.getSenderAddress().toString('hex') == ethUtil.privateToAddress(privKeys[0]).toString('hex'))
    var proof = block.merkleTree.getProof(63, false)
    console.log(proof);
    return true;  
}

// testBlock();






 




app.get('/plasmaParent/lastSubmittedHeader', 'lastSubmittedHeader', async function(req, res){
    try{ 
        const headerNumber = await DeployedPlasmaContract.methods.lastBlockNumber().call({from:allAccounts[2]});

        return res.json({lastSubmittedHeader:headerNumber});
    }
    catch(error){
         return res.json({error: true, reason: "invalid request"});
    }
});






function jump(duration) {
    return async function() {
    //   console.log("Jumping " + duration + "...");

      var params = duration.split(" ");
      params[0] = parseInt(params[0])

      var seconds = moment.duration.apply(moment, params).asSeconds();
      await sendAsyncPromisified({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [seconds],
        id: new Date().getTime()
        });
    }
}

//demo purposes only
app.post('/finalizeWithdraw', 'finalizeWithdraw', async function(req, res){
    try{ 
        const {inEthereumBlock, withdrawIndex} = req.body
        if (!inEthereumBlock || !withdrawIndex) {
            return res.json({error: true, reason: "invalid request"});
            // next()
        }
        await jump("2 days")();
        var result = await DeployedPlasmaContract.methods.finalizeWithdraw(inEthereumBlock, withdrawIndex).send({from:allAccounts[2], gas: 3.6e6});
        const finalizationEvent = result.events.WithdrawFinalizedEvent; 
        const response =  {error: false, status: "finalized", to: finalizationEvent.returnValues._to}
        return res.json(response);
    }
    catch(error){
         res.json({error: true, reason: "invalid request"});
 
    }
});


function sliceRawBufferForTx(buf){
    assert(buf.length == 94);
    const txBinArray = [buf.slice(0,4), buf.slice(4,5), buf.slice(5,9), buf.slice(9,29), buf.slice(29,30), buf.slice(30,62), buf.slice(62,94)]
    return txBinArray;
}

async function createDummyBlock(){
    if (lastBlock.readUInt32BE(0) == 0x00000000) {
 
        for (let i=0; i< 42; i++) {  
            const buff = Buffer(1)
            buff.writeUInt8(i);
            const txParams = {
                blockNumber: "0x00000000",
                txInBlock: '0x'+buff.toString('hex'),
                assetId: '0x00000000',
                to: '0x'+ethUtil.privateToAddress(privKeys[1]).toString('hex'), 
              }
            const tx = new PlasmaTransaction(txParams);
            tx.sign(privKeys[0]); 
            txParamsFIFO.push(tx);
        }
        await createBlock();
    }
}

async function prepareOracle(){
    await startVM();
    await comp();
    await populateAccounts();
    await deployContracts();
    try{
        lastBlock = await levelDB.get('lastBlockNumber');
    }
    catch(error) {
        lastBlock = Buffer.alloc(4)
        lastBlock.writeUInt32BE(0,0);
        await levelDB.put('lastBlockNumber', lastBlock);
    }
    try{
        lastBlockHash = await levelDB.get('lastBlockHash');
    }
    catch(error) {
        lastBlockHash = ethUtil.sha3('bankex.com')
        await levelDB.put('lastBlockHash', lastBlockHash);
    }
    app.txQueueArray = [];
    app.DeployedPlasmaContract = DeployedPlasmaContract;
    require('./app/miner')(app, levelDB, web3);
    require('./app/endpoints/fundPlasma')(app, levelDB, web3);
    require('./app/endpoints/acceptAndSignTransaction')(app, levelDB, web3);
    require('./app/endpoints/getBlockByNumber')(app, levelDB, web3);
    require('./app/endpoints/getUTXOsForAddress')(app, levelDB, web3);
    require('./app/endpoints/withdraw')(app, levelDB, web3);
    require('./app/endpoints/auxilary')(app, levelDB, web3);
}

prepareOracle().then((result) => {
    app.listen(port, async () => {
        
        console.log('We are live on ' + port);
        console.log(config.testAccounts[0])
        console.log(config.testAccounts[1])
        console.log("Operator address = 0x"+ ethUtil.privateToAddress(plasmaOperatorPrivKey).toString('hex'))

        app._router.stack.forEach(function(r){
        if (r.name && r.name == 'bound dispatch'){
            console.log(r.route.path)
            }
            })
        })
    }
)

         

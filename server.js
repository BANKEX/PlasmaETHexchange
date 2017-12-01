const express        = require('express');
var rimraf = require('rimraf');
rimraf.sync('./db');
console.log("Cleared DB");
var Router = require('named-routes');
const app            = express();
var router = new Router();
router.extendExpress(app);
router.registerAppHelpers(app);
const bodyParser = require('body-parser');
app.use(bodyParser.json());

const comp = require('./compile');

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
const plasmaOperatorPrivKeyHex = config.plasmaOperatorPrivKeyHex;
const plasmaOperatorPrivKey = ethUtil.toBuffer(plasmaOperatorPrivKeyHex);
const plasmaOperatorAddress = config.plasmaOperatorAddress;      
const testPrivKeys = config.testPrivKeys;  
const port = 8000;

var sendAsyncPromisified;
var PlasmaContract;
var DeployedPlasmaContract;
var Web3PlasmaContract;
var web3;

function startVM(){
    var provider = TestRPC.provider({
        total_accounts: 10,
        time:new Date(),
        verbose:false,
        gasPrice: 0,
      accounts:[
          {secretKey:"0x" + plasmaOperatorPrivKey.toString('hex'), balance: 4.2e18},
          {secretKey:"0x" + testPrivKeys[0].toString('hex'), balance: 4.2e18},
          {secretKey:"0x" + testPrivKeys[1].toString('hex'), balance: 4.2e18}    
      ],
        mnemonic: "42"
        // ,
        // logger: console
      });
      web3 = new Web3(provider);
      sendAsyncPromisified = util.promisify(provider.sendAsync).bind(provider);
}

async function populateAccounts(){
    PlasmaContract = new TruffleContract(require("./build/contracts/PlasmaParent.json"));
    Web3PlasmaContract = new web3.eth.Contract(PlasmaContract.abi);
}

async function deployContracts() {
    DeployedPlasmaContract = await Web3PlasmaContract.deploy({data: PlasmaContract.bytecode}).send({from: plasmaOperatorAddress, gas: 6e6}) ;
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

app.get('/plasmaParent/lastSubmittedHeader', 'lastSubmittedHeader', async function(req, res){
    try{ 
        const headerNumber = await DeployedPlasmaContract.methods.lastBlockNumber().call({from:plasmaOperatorAddress});

        return res.json({lastSubmittedHeader:headerNumber});
    }
    catch(error){
         return res.json({error: true, reason: "invalid request"});
    }
});

function jump(duration) {
    return async function() {
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

app.jump = jump;


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

         

const config = require('./app/config/config');
var rimraf = require('rimraf');
if (!config.testOnRinkeby) {
    rimraf.sync('./db');
    console.log("Cleared DB");
}

const express        = require('express');
const app            = express();
const https = require('https')
const Router = require('named-routes');
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
const BN = Web3.utils.BN;
const util = require('util');
const ethUtil = require('ethereumjs-util'); 
const PlasmaTransaction = require('./lib/Tx/tx');
const Block = require('./lib/Block/block');
const fromBtcWif = coinstring.createDecoder(0x80);
const levelup = require('levelup')
const leveldown = require('leveldown')
const levelDB = levelup(leveldown('./db'))

let lastBlock;
let lastBlockHash;
let blockMiningTimer;
const {blockNumberLength} = require("./lib/dataStructureLengths");

const plasmaOperatorPrivKeyHex = config.plasmaOperatorPrivKeyHex;
const plasmaOperatorPrivKey = ethUtil.toBuffer(plasmaOperatorPrivKeyHex);
const plasmaOperatorAddress = config.plasmaOperatorAddress;      
const testPrivKeys = config.testPrivKeys;  
const port = config.port;

let sendAsyncPromisified;
let PlasmaContract;
let DeployedPlasmaContract;
let Web3PlasmaContract;
let web3;

async function startVM(){
    if (config.testOnRinkeby) {
        web3 = new Web3(config.provider);
        let unlocked = await web3.eth.personal.unlockAccount(config.plasmaOperatorAddress, config.plasmaOperatorPassword, 0);
        let provider = web3.currentProvider;
        sendAsyncPromisified = util.promisify(provider.send).bind(provider);
        return;
    }
    let provider = TestRPC.provider({
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



async function deployContracts() {
    PlasmaContract = new TruffleContract(require("./build/contracts/PlasmaParent.json"));
    if (config.testOnRinkeby) {
        if (config.deployedPlasmaContract == "") {
            Web3PlasmaContract = new web3.eth.Contract(PlasmaContract.abi, {from: config.plasmaOperatorAddress, gasPrice: 35e9});
            DeployedPlasmaContract = await Web3PlasmaContract.deploy({data: PlasmaContract.bytecode}).send({from: config.plasmaOperatorAddress, gas: 6e6});
            console.log("Deployed at "+ DeployedPlasmaContract._address);
            return;
        }
        DeployedPlasmaContract = new web3.eth.Contract(PlasmaContract.abi, config.deployedPlasmaContract,{from: config.plasmaOperatorAddress, gasPrice: 35e9});
        console.log("Deployed at "+ DeployedPlasmaContract._address);
        return;
    }
    Web3PlasmaContract = new web3.eth.Contract(PlasmaContract.abi, {from: config.plasmaOperatorAddress});
    DeployedPlasmaContract = await Web3PlasmaContract.deploy({data: PlasmaContract.bytecode}).send({from: plasmaOperatorAddress, gas: 6e6});
    console.log("Deployed at "+ DeployedPlasmaContract._address);
}



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
    await deployContracts();
    try{
        lastBlock = await levelDB.get('lastBlockNumber');
    }
    catch(error) {
        lastBlock = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(0)),blockNumberLength)
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
    const processDepositEvent = require('./app/helpers/processDepositEvent')(app, levelDB, web3);
    const processExpressWithdrawMakeEvent = require('./app/helpers/processExpressWithdrawMadeEvent')(app, levelDB, web3);
    app.processDepositEvent = processDepositEvent;
    app.processExpressWithdrawMakeEvent = processExpressWithdrawMakeEvent;
    require('./app/miner')(app, levelDB, web3);
    // require('./app/endpoints/fundPlasma')(app, levelDB, web3);
    // require('./app/endpoints/acceptAndSignTransaction')(app, levelDB, web3);
    require('./app/endpoints/createTransactionToSign')(app,levelDB,web3);
    require('./app/endpoints/acceptSignedTX')(app, levelDB, web3);
    require('./app/endpoints/getBlockByNumber')(app, levelDB, web3);
    require('./app/endpoints/getTxByNumber')(app, levelDB, web3);
    require('./app/endpoints/getUTXOsForAddress')(app, levelDB, web3);
    require('./app/endpoints/getTXsForAddress')(app, levelDB, web3);
    require('./app/endpoints/getWithdrawsForAddress')(app, levelDB, web3);
    // require('./app/endpoints/withdraw')(app, levelDB, web3);
    require('./app/endpoints/auxilary')(app, levelDB, web3);
    require('./app/endpoints/prepareProofForExpressWithdraw')(app, levelDB, web3);
}

prepareOracle().then(async (result) => {
    if (config.useSSL) {
        const privateKey = fs.readFileSync( 'privatekey.pem' );
        const certificate = fs.readFileSync( 'certificate.pem' );
        await https.createServer({
            key: privateKey,
            cert: certificate
        }, app).listen(port);
        console.log("Live using SSL")
        console.log('We are live on ' + port);
        // console.log(config.testAccounts[0])
        // console.log(config.testAccounts[1])
        console.log("Operator address = " + config.plasmaOperatorAddress);
        app._router.stack.forEach(function(r){
        if (r.name && r.name == 'bound dispatch'){
            console.log(r.route.path)
            }
            })
        }
    else {
        app.listen(port, async () => {
            console.log('We are live on ' + port);
            // console.log(config.testAccounts[0])
            // console.log(config.testAccounts[1])
            console.log("Operator address = " + config.plasmaOperatorAddress);
            app._router.stack.forEach(function(r){
            if (r.name && r.name == 'bound dispatch'){
                console.log(r.route.path)
                }
                })
            })
        }
    }
)

         

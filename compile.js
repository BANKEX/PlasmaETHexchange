const assert = require('assert');
var fs = require("fs");
var solc = require('solc');
 
const Artifactor = require("truffle-artifactor"); 
const TruffleContract = require('truffle-contract');

const Web3 = require("web3");
const util = require('util');

const artifactor = new Artifactor("./build/contracts");
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const Contracts = ['PlasmaParent:PlasmaParent']


function findImports (path) {
  try{
    var input = fs.readFileSync("./contracts/"+path);
    var ret = {contents: input.toString()};
    // ret[path] = input.toString();
    return ret;
  }
  catch(error){
    return { error: 'File not found' }
  }
}

async function main() {
  console.log("Compiling contracts...");
  var inputs = {}; 
    for (contract of Contracts){
      var parts = contract.split(':');
      inputs[contract+'.sol'] =  fs.readFileSync("./contracts/"+parts[0]+".sol", 'utf8');
    }
    try{ 
      var output = solc.compile({ sources: inputs }, 1, findImports)
    }
    catch(error){
      console.log(error);
    }
    for (err in output.errors){
      console.log(output.errors[err]);
    }
    if (!output.contracts || Object.keys(output.contracts).length == 0){
      throw("Didn't compile");
    }
    // new RegExp('__([a-zA-Z.:]+)[_]*', 'g');
    // const libraryRE = /__([a-zA-Z.:]+)[_]*/g.compile();
    const libraryRE = new RegExp('__([a-zA-Z.:]+)[_]*', 'g');
    for (var property in output.contracts) {
      if (output.contracts.hasOwnProperty(property)) {
        var contract = output.contracts[property];
        var bytecode = contract.bytecode;
        if (libraryRE.test(bytecode)){
          console.log("Linking is necessary!");
          var m;
          m = libraryRE.exec(bytecode);
          while ((m = libraryRE.exec(bytecode)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === libraryRE.lastIndex) {
              libraryRE.lastIndex++;
            }
            // The result can be accessed through the `m`-variable.
            const libName = m[1];
            const libObject = {};
            libObject[libName] = output.contracts[libName].bytecode;
          }
        }
        var meta = JSON.parse(contract.metadata);
        if (bytecode == ""){
          console.log("Bytecode is empty!");
        }
        var abi = JSON.parse(contract.interface);
        const p = property.split(':');
        await artifactor.save({contract_name: p[p.length-1],  abi: abi, unlinked_binary: bytecode});
      }
  }
    console.log("Done compiling");
}  

module.exports = main;

 
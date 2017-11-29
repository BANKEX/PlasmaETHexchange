const assert = require('assert');
var fs = require("fs");
var solc = require('solc');
var rimraf = require('rimraf');
rimraf.sync('./build/contracts');
 
const Artifactor = require("truffle-artifactor"); 
const TruffleContract = require('truffle-contract');

const Web3 = require("web3");
const util = require('util');

const artifactor = new Artifactor("./build/contracts");
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const Contracts = {
  "PlasmaParent" : ["PlasmaParent"]
}


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
  let inputs = {}; 
  let output;
    for (let contract in Contracts){
      inputs[contract+'.sol'] =  fs.readFileSync("./contracts/" + contract + '.sol', 'utf8');
    }
    try{ 
      output = solc.compile({ sources: inputs }, 1, findImports)
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
    const libraryRE = new RegExp('__([a-zA-Z.:]+)[_]*', 'g');
    for (let property in output.contracts) {
      let inList = false;
      for (let c in Contracts) {
        for (let cName of Contracts[c]){
          let fullName = c+".sol:"+cName;

          if (property === fullName){
            inList = true;
            break;
          }
        }
        if (inList){
          break;
        }
      }
      if (!inList){
        continue;
      }
      if (output.contracts.hasOwnProperty(property)) {
        let cont = output.contracts[property];
        let bytecode = cont.bytecode;
        if (libraryRE.test(bytecode)){
          console.log("Linking is necessary!");
          var m;
          m = libraryRE.exec(bytecode);
          while ((m = libraryRE.exec(bytecode)) !== null) {
            if (m.index === libraryRE.lastIndex) {
              libraryRE.lastIndex++;
            }
            const libName = m[1];
            const libObject = {};
            libObject[libName] = output.contracts[libName].bytecode;
          }
        }
        if (bytecode == ""){
          console.log("Bytecode is empty!");
        }
        try{
          var abi = JSON.parse(cont.interface);
        }
        catch(e){
          console.log(e);
        }
        const p = property.split(':');
        await artifactor.save({contract_name: p[p.length-1],  abi: abi, unlinked_binary: bytecode});
      }
  }
    console.log("Done compiling");
}  

module.exports = main;

 
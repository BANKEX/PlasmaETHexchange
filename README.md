# The Plasma protocol compatible ETH Exchange Platform

#WIP

# Clarification

Initial implementation of single server side "Operator" service (with some extra functionality for testing) and v0.1 smart contract for Ethereum blockchain that can be use to enforce proper behavior in case of disputes.

### At the moment a groundwork is done (convenience functions + cryptography) in smart contract to continue writing required processes "Start -> (Challenge?) -> Complete".

Implemented challenges:

1. Deposit -> No deposit published in Plasma chain? -> Start withdraw for deposit? -> Challenge deposit withdraw? -> Finalize"
2. Deposit -> Do few transactions -> Start UTXO withdraw -> Express withdraw / Normal withdraw" 

Required challanges:
1. Proof double spend (start withdraw and than spent on Plasma or vice-versa)
2. Plain double spend 
3. Proof funding transaction in Plasma without corresponding deposit in Ethereum network (or duplicate funding TX)
4. Proof incorrectly signed TX
5. Other to follow... 


## What?

The task is to make blockchain transactions as fast as they can be applied virtually to any application.

## How?

One of possible solutions is Plasma - the prominent upgrade to Ethereum blockchain. Our approach is based on this conception.

## Plasma Network Technical Concept

From technical point of view Plasma blockchain - is just another blockchain, that can be efficiently settled to parent Ethereum chain and is well protected from misbehavior of both Plasma operator and Plasma blockchain participats by smart-contract on Ethererum network.

Plasma chain itself has very simple structure with assets being undividable and transfered in full from previous owner to the next one. Transaction has inputs and outputs, with few different types of transactions depending from required function. For example, we propose type "Merge" to merge two inputs into one output to reduce number of UTXOs to follow by client. Full description will be given when design is more stable. All chain logic is made using Ethereum crypto primitives - sha3, secp256k1 and 65 byte signatures allowing use of ecrecover.

Block in Plasma network has a structure of Header:[BlockNumber, NumberOfTransactions, ParentHash, MerkleTreeRoot, PlasmaOperatorSignature], where ParentHash references previous block (by number) and MerkleTreeRoot is root hash of a Merkle tree NumberOfTransactions transacitons in this Plasma block and array of transactions.

Header is submitted by Plasma network operator to the smart-contract on Ethereum chain. Blocks can only be sent one by one, with sequence numbering is enforced by contract. Any user of Ethereum network can deposit ETH to contract that will trigger and event and will allow Plasma network operator to make a funding transaction in Plasma chain. Than users can freely transact in Plasma chain, with headers pushed to parent contract in Ethereum.

When user wants to settle one of his transactions to the main network, he starts a withdraw on Ethereum network by providing reference to the transaction (in a form of BlockNumber, TxNumberInBlock, OutputNumberInTX), full transaction and Merkle proof that this transaction was indeed included in that block. Parent contract checks a proof versus submittet root hash for this block and if it passed starts withdraw process. After 24 hours it can be finalized. There is a special kind of transaction in Plasma netword that can speedup a process by effectively burning the input (sending it to 0x0). If this block is not published by operator, withdraw can go as normal.


## Technology in PoC

Concept is implemented using JS with conjuction on Web3 and Ethereumjs-Testrpc on a backend. For sake of simplicity all necessary functions are wrapped in REST API calls doing signatures on behalf of predefined set of address on a server, but further work will allow users to use wallet apps such as Metamask to initiate transactions in a Plasma network by making a signature on a client side and interacting with a parent contract on Ethereum network as usual.

## Why Plasma

Here at BANKEX we believe in efficiency of offloading of some transactions from Ethereum blockchain to Plasma chains especially if proper incentive is present for Plasma operators to behave properly (such incentive can we even in a form of completing with other operators for obtaining end-users). Another advantage is a flexibility of Plasma chain implementation as long as it can be effectively cross-checked by contract on a parent chain. With new cryptographic primitived added in Metropolis fork one can extent our PoC implementation with transactions utilizing ring signatures of zkSNARKs for privacy of end user.

### Installation and Prerequisutes

System requirements:

* Ubuntu or similar is preferrable but can also be run on Mas OS X or Windows as well
* NodeJS version >= 8.9. Tested on 9.0

### Repository Cloning

```bash
git clone https://github.com/BankEx/PlasmaETHexchange.git
cd PlasmaETHexchange
```

### Running

```bash
npm install
npm run server
```

### Usage

Backend ```localhost:8000/```

Insomnia.json is an Insomnia workspace file with various testing functions, play with it.

Addresses:

User 1: 0xf62803ffaddda373d44b10bf6bb404909be0e66b
User 2: 0xcf78f18299eac0e0a238db7f4742ef433f98c85e

Operator (oracle) : 0x405aaaa4bdcda14a0af295f3669459b6b0fc8104

### Basic Plasma API description

Will be filled later

## Contributions

* [shamatar](https://github.com/shamatar)



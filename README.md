# Plasma protocol compatible ETH Exchange Platform

# WIP!

# Clarification

Initial implementation of a single server-side "Operator" service (with some extra functionality for testing) and v0.1 smart contract for Ethereum blockchain that can be used to enforce proper behavior in case of disputes.

### At the moment the groundwork is done (convenience functions + cryptography) in smart contract to continue writing required processes "Start -> (Challenge?) -> Complete".

Implemented challenges:

1. Deposit -> No deposit published in Plasma chain? -> Start withdrawing for deposit? -> Challenge deposit withdraw? -> Finalize
2. Deposit -> Do few transactions -> Start UTXO withdraw -> Express withdraw / Normal withdraw 
3. Prove double spending on Plasma chain
4. Prove spending the same output on Plasma and successfully withdrawing it
5. Prove funding without deposit event or double funding TX of the same deposit

Required challenges:
1. Proof of incorrect TX: signature doesn't correspond to spent UTXOs, or amount is invalid. Special check for trying to spend auxilary transaction output of funding transaction.

## What?

The task is to make blockchain transactions as fast as they can be applied virtually to any application.

## How?

One of the possible solutions is Plasma - the prominent upgrade to Ethereum blockchain. Our approach is based on this conception.

## Plasma Network Technical Concept

From a technical point of view Plasma blockchain - is just another blockchain, that can be efficiently settled to parent Ethereum chain and is well protected from the misbehavior of both Plasma operator and Plasma blockchain participants by smart-contract on Ethererum network.

Plasma chain itself has a straightforward structure with assets being undividable and transferred in full from the previous owner to the next one. The transaction has inputs and outputs, with few different types of transactions depending on the required function. For example, we propose type "Merge" to connect two inputs into one output in order to reduce the number of UTXOs that will be followed by the client. Full description will be given when the design is more stable. All chain logic is made using Ethereum crypto primitives - sha3, secp256k1 and 65-byte signatures allowing the use of ecrecover.

Block in Plasma network has a structure of Header: ```[BlockNumber, NumberOfTransactions, ParentHash, MerkleTreeRoot, PlasmaOperatorSignature]```, where 

- `ParentHash` references to the previous block (by number)
- `MerkleTreeRoot` is root hash of a Merkle tree 
- `NumberOfTransactions` transactions in this Plasma block and an array of transactions.

The header is submitted by Plasma network operator to the smart-contract on Ethereum chain. Blocks can only be sent one by one, with sequence numbering is enforced by contract. Any user of Ethereum network can deposit ETH to contract that will trigger, event and will allow Plasma network operator to make a funding transaction in a Plasma chain. Then users can freely transact in Plasma chain, with headers pushed to a parent contract in Ethereum.

When a user wants to settle one of his transactions to the main network, he initiates a withdraw on Ethereum network by providing the reference to the transaction (in the form of `BlockNumber`, `TxNumberInBlock`, `OutputNumberInTX`), full transaction and Merkle proof that this transaction was indeed included in that block. Parent contract checks a proof versus submitted root hash for this block. If validation was sucessefull the process of withdrawing starts. After 24 hours it can be finalized. There is a particular kind of transaction in Plasma network that can speed up a process by efficiently burning the input (sending it to `0x0`). If this block is not published by the operator, withdrawing can go as usual.


## Technology in PoC

The concept is implemented using JS with conjunction on [Web3](https://github.com/ethereum/web3.js/) and [ethereumjs/testrpc](https://github.com/ethereumjs/testrpc) on a backend. For the sake of simplicity, all necessary functions are wrapped in REST API calls doing signatures on behalf of a predefined set of the address on a server. Further work will allow users to use wallet apps such as Metamask to initiate transactions in a Plasma network by making a signature on a client side and interacting with a parent contract on Ethereum network as usual.

## Why Plasma?

Here at BankEx, we believe in the efficiency of offloading of some transactions from Ethereum blockchain to Plasma chains especially if the proper incentive is present for Plasma operators to behave appropriately (such incentive can be presented in the form of competing with other operators for obtaining end-users). Another advantage is a flexibility of Plasma chain implementation as long as it can be effectively cross-checked by contract on a parent chain. With the new cryptographic primitive added in Metropolis fork, one can extend our PoC implementation with transactions utilizing ring signatures of **zkSNARK**s for the privacy of end user.

### Installation:

#### System requirements:

* Ubuntu or similar is preferable but can also be run on Mac OS X or Windows as well
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

`Insomnia.json` is an Insomnia workspace file with various testing functions, play with it.

**!! May require some parameter changes in existing requests to comply with new output numbering.**

#### Addresses:

User 1: `0xf62803ffaddda373d44b10bf6bb404909be0e66b`

User 2: `0xcf78f18299eac0e0a238db7f4742ef433f98c85e`

Operator (oracle): `0x405aaaa4bdcda14a0af295f3669459b6b0fc8104`

### Basic Plasma API description

> Will be filled later

## Contributions

* [shamatar](https://github.com/shamatar)

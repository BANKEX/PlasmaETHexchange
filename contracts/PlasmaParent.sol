pragma solidity ^0.4.18;

library ByteSlice {

    struct Slice {
        uint _unsafe_memPtr;   // Memory address of the first byte.
        uint _unsafe_length;   // Length.
    }

    /// @dev Converts bytes to a slice.
    /// @param self The bytes.
    /// @return A slice.
    function slice(bytes memory self) internal constant returns (Slice memory slice) {
        assembly {
            let len := mload(self)
            let memPtr := add(self, 0x20)
            mstore(slice, mul(memPtr, iszero(iszero(len))))
            mstore(add(slice, 0x20), len)
        }
    }

    /// @dev Converts bytes to a slice from the given starting position.
    /// 'startpos' <= 'len(slice)'
    /// @param self The bytes.
    /// @param startpos The starting position.
    /// @return A slice.
    function slice(bytes memory self, uint startpos) internal constant returns (Slice memory) {
        return slice(slice(self), startpos);
    }

    /// @dev Converts bytes to a slice from the given starting position.
    /// -len(slice) <= 'startpos' <= 'len(slice)'
    /// @param self The bytes.
    /// @param startpos The starting position.
    /// @return A slice.
    function slice(bytes memory self, int startpos) internal constant returns (Slice memory) {
        return slice(slice(self), startpos);
    }

    /// @dev Converts bytes to a slice from the given starting-position, and end-position.
    /// 'startpos <= len(slice) and startpos <= endpos'
    /// 'endpos <= len(slice)'
    /// @param self The bytes.
    /// @param startpos The starting position.
    /// @param endpos The end position.
    /// @return A slice.
    function slice(bytes memory self, uint startpos, uint endpos) internal constant returns (Slice memory) {
        return slice(slice(self), startpos, endpos);
    }

    /// @dev Converts bytes to a slice from the given starting-position, and end-position.
    /// Warning: higher cost then using unsigned integers.
    /// @param self The bytes.
    /// @param startpos The starting position.
    /// @param endpos The end position.
    /// @return A slice.
    function slice(bytes memory self, int startpos, int endpos) internal constant returns (Slice memory) {
        return slice(slice(self), startpos, endpos);
    }

    /// @dev Get the length of the slice (in bytes).
    /// @param self The slice.
    /// @return the length.
    function len(Slice memory self) internal constant returns (uint) {
        return self._unsafe_length;
    }

    /// @dev Returns the byte from the backing array at a given index.
    /// The function will throw unless 'index < len(slice)'
    /// @param self The slice.
    /// @param index The index.
    /// @return The byte at that index.
    function at(Slice memory self, uint index) internal constant returns (byte b) {
        if (index >= self._unsafe_length)
            revert();
        uint bb;
        assembly {
            // Get byte at index, and format to 'byte' variable.
            bb := byte(0, mload(add(mload(self), index)))
        }
        b = byte(bb);
    }

    /// @dev Returns the byte from the backing array at a given index.
    /// The function will throw unless '-len(self) <= index < len(self)'.
    /// @param self The slice.
    /// @param index The index.
    /// @return The byte at that index.
    function at(Slice memory self, int index) internal constant returns (byte b) {
        if (index >= 0)
            return at(self, uint(index));
        uint iAbs = uint(-index);
        if (iAbs > self._unsafe_length)
            revert();
        return at(self, self._unsafe_length - iAbs);
    }

    /// @dev Set the byte at the given index.
    /// The function will throw unless 'index < len(slice)'
    /// @param self The slice.
    /// @param index The index.
    /// @return The byte at that index.
    function set(Slice memory self, uint index, byte b) internal constant {
        if (index >= self._unsafe_length)
            revert();
        assembly {
            mstore8(add(mload(self), index), byte(0, b))
        }
    }

    /// @dev Set the byte at the given index.
    /// The function will throw unless '-len(self) <= index < len(self)'.
    /// @param self The slice.
    /// @param index The index.
    /// @return The byte at that index.
    function set(Slice memory self, int index, byte b) internal constant {
        if (index >= 0)
            return set(self, uint(index), b);
        uint iAbs = uint(-index);
        if (iAbs > self._unsafe_length)
            revert();
        return set(self, self._unsafe_length - iAbs, b);
    }

    /// @dev Creates a copy of the slice.
    /// @param self The slice.
    /// @return the new reference.
    function slice(Slice memory self) internal constant returns (Slice memory newSlice) {
        newSlice._unsafe_memPtr = self._unsafe_memPtr;
        newSlice._unsafe_length = self._unsafe_length;
    }

    /// @dev Create a new slice from the given starting position.
    /// 'startpos' <= 'len(slice)'
    /// @param self The slice.
    /// @param startpos The starting position.
    /// @return The new slice.
    function slice(Slice memory self, uint startpos) internal constant returns (Slice memory newSlice) {
        uint len = self._unsafe_length;
        if (startpos > len)
            revert();
        assembly {
            len := sub(len, startpos)
            let newMemPtr := mul(add(mload(self), startpos), iszero(iszero(len)))
            mstore(newSlice, newMemPtr)
            mstore(add(newSlice, 0x20), len)
        }
    }

    /// @dev Create a new slice from the given starting position.
    /// -len(slice) <= 'startpos' <= 'len(slice)'
    /// @param self The slice.
    /// @param startpos The starting position.
    /// @return The new slice.
    function slice(Slice memory self, int startpos) internal constant returns (Slice memory newSlice) {
        uint sAbs;
        uint startpos_;
        uint len = self._unsafe_length;
        if (startpos >= 0) {
            startpos_ = uint(startpos);
            if (startpos_ > len)
                revert();
        } else {
            startpos_ = uint(-startpos);
            if (startpos_ > len)
                revert();
            startpos_ = len - startpos_;
        }
        assembly {
            len := sub(len, startpos_)
            let newMemPtr := mul(add(mload(self), startpos_), iszero(iszero(len)))
            mstore(newSlice, newMemPtr)
            mstore(add(newSlice, 0x20), len)
        }
    }

    /// @dev Create a new slice from a given slice, starting-position, and end-position.
    /// 'startpos <= len(slice) and startpos <= endpos'
    /// 'endpos <= len(slice)'
    /// @param self The slice.
    /// @param startpos The starting position.
    /// @param endpos The end position.
    /// @return the new slice.
    function slice(Slice memory self, uint startpos, uint endpos) internal constant returns (Slice memory newSlice) {
        uint len = self._unsafe_length;
        if (startpos > len || endpos > len || startpos > endpos)
            revert();
        assembly {
            len := sub(endpos, startpos)
            let newMemPtr := mul(add(mload(self), startpos), iszero(iszero(len)))
            mstore(newSlice, newMemPtr)
            mstore(add(newSlice, 0x20), len)
        }
    }

    /// Same as new(Slice memory, uint, uint) but allows for negative indices.
    /// Warning: higher cost then using unsigned integers.
    /// @param self The slice.
    /// @param startpos The starting position.
    /// @param endpos The end position.
    /// @return The new slice.
    function slice(Slice memory self, int startpos, int endpos) internal constant returns (Slice memory newSlice) {
       // Don't allow slice on bytes of length 0.
        uint startpos_;
        uint endpos_;
        uint len = self._unsafe_length;
        if (startpos < 0) {
            startpos_ = uint(-startpos);
            if (startpos_ > len)
                revert();
            startpos_ = len - startpos_;
        }
        else {
            startpos_ = uint(startpos);
            if (startpos_ > len)
                revert();
        }
        if (endpos < 0) {
            endpos_ = uint(-endpos);
            if (endpos_ > len)
                revert();
            endpos_ = len - endpos_;
        }
        else {
            endpos_ = uint(endpos);
            if (endpos_ > len)
                revert();
        }
        if(startpos_ > endpos_)
            revert();
        assembly {
            len := sub(endpos_, startpos_)
            let newMemPtr := mul(add(mload(self), startpos_), iszero(iszero(len)))
            mstore(newSlice, newMemPtr)
            mstore(add(newSlice, 0x20), len)
        }
    }

    /// @dev Creates a 'bytes memory' variable from a slice, copying the data.
    /// Bytes are copied from the memory address 'self._unsafe_memPtr'.
    /// The number of bytes copied is 'self._unsafe_length'.
    /// @param self The slice.
    /// @return The bytes variable.
    function toBytes(Slice memory self) internal constant returns (bytes memory bts) {
        uint length = self._unsafe_length;
        if (length == 0)
            return;
        uint memPtr = self._unsafe_memPtr;
        bts = new bytes(length);
        // We can do word-by-word copying since 'bts' was the last thing to be
        // allocated. Just overwrite any excess bytes at the end with zeroes.
        assembly {
                let i := 0
                let btsOffset := add(bts, 0x20)
                let words := div(add(length, 31), 32)
            tag_loop:
                jumpi(end, gt(i, words))
                {
                    let offset := mul(i, 32)
                    mstore(add(btsOffset, offset), mload(add(memPtr, offset)))
                    i := add(i, 1)
                }
                jump(tag_loop)
            end:
                mstore(add(add(bts, length), 0x20), 0)
        }
    }

    /// @dev Creates an ascii-encoded 'string' variable from a slice, copying the data.
    /// Bytes are copied from the memory address 'self._unsafe_memPtr'.
    /// The number of bytes copied is 'self._unsafe_length'.
    /// @param self The slice.
    /// @return The bytes variable.
    function toAscii(Slice memory self) internal constant returns (string memory str) {
        return string(toBytes(self));
    }

    /// @dev Check if two slices are equal.
    /// @param self The slice.
    /// @param other The other slice.
    /// @return True if both slices point to the same memory address, and has the same length.
    function equals(Slice memory self, Slice memory other) internal constant returns (bool) {
        return (
            self._unsafe_length == other._unsafe_length &&
            self._unsafe_memPtr == other._unsafe_memPtr
        );
    }

}

library Bytes {

    function concat(bytes memory self, bytes memory bts) internal view returns (bytes memory newBts) {
        uint totLen = self.length + bts.length;
        if (totLen == 0)
            return;
        newBts = new bytes(totLen);
        assembly {
                let i := 0
                let inOffset := 0
                let outOffset := add(newBts, 0x20)
                let words := 0
                let tag := tag_bts
            tag_self:
                inOffset := add(self, 0x20)
                words := div(add(mload(self), 31), 32)
                jump(tag_loop)
            tag_bts:
                i := 0
                inOffset := add(bts, 0x20)
                outOffset := add(newBts, add(0x20, mload(self)))
                words := div(add(mload(bts), 31), 32)
                tag := tag_end
            tag_loop:
                jumpi(tag, gt(i, words))
                {
                    let offset := mul(i, 32)
                    outOffset := add(outOffset, offset)
                    mstore(outOffset, mload(add(inOffset, offset)))
                    i := add(i, 1)
                }
                jump(tag_loop)
            tag_end:
                mstore(add(newBts, add(totLen, 0x20)), 0)
        }
    }

    function uintToBytes(uint self) internal pure returns (bytes memory s) {
        uint maxlength = 100;
        bytes memory reversed = new bytes(maxlength);
        uint i = 0;
        while (self != 0) {
            uint remainder = self % 10;
            self = self / 10;
            reversed[i++] = byte(48 + remainder);
        }
        s = new bytes(i);
        for (uint j = 0; j < i; j++) {
            s[j] = reversed[i - 1 - j];
        }
        return s;
    }
}

contract PlasmaParent {
    using Bytes for *;
    using ByteSlice for *;
    address public owner = msg.sender;
    address public operator = msg.sender;
    uint32 public blockHeaderLength = 137;
    
    uint256 public lastBlockNumber = 0;
    uint256 public lastEthBlockNumber = block.number;
    uint256 public depositCounterInBlock = 0;
    
    struct Header {
        uint32 blockNumber;
        uint32 numTransactions;
        uint8 v;
        bytes32 previousBlockHash;
        bytes32 merkleRootHash;
        bytes32 r;
        bytes32 s;
    }
    
    enum WithdrawStatus {
        NoRecord,
        Started,
        Challenged,
        Completed,
        Rejected
    }

    enum DepositStatus {
        NoRecord,
        Deposited,
        WithdrawStarted,
        WithdrawChallenged,
        WithdrawCompleted,
        DepositConfirmed
    }

    struct DepositRecord {
        address from; 
        DepositStatus status;
        uint256 amount; 
        uint256 index;
        uint256 withdrawStartedTime;
    } 

    struct WithdrawRecord {
        uint256 index;
        uint32 blockNumber;
        uint32 txNumberInBlock;
        uint8 outputNumberInTX;
        address beneficiary;
        bool isExpress;
        WithdrawStatus status;
        uint256 amount;
        uint256 timeStarted;
        uint256 timeEnded;
    }

    
    struct TransactionInput {
        uint32 blockNumber;
        uint32 txNumberInBlock;
        uint8 outputNumberInTX;
        uint256 amount;
    }

    
    struct TransactionOutput {
        address recipient;
        uint8 outputNumberInTX;
        uint256 amount;
    }

    struct PlasmaTransaction {
        uint32 txNumberInBlock;
        uint8 txType;
        TransactionInput[] inputs;
        TransactionOutput[] outputs;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    uint256 constant TxTypeNull = 0;
    uint256 constant TxTypeSplit = 1;
    uint256 constant TxTypeMerge = 2;
    uint256 constant TxTypeWithdraw = 3;
    uint256 constant TxTypeFund = 4;
    uint256 constant TxTypeTransfer = 5;

    uint256[6] NumInputsForType = [0, 1, 2, 1, 1, 1];
    uint256[6] NumOutputsForType = [0, 2, 1, 1, 2, 1];

    uint256 constant SignatureLength = 65;
    uint256 constant BlockNumberLength = 4;
    uint256 constant TxNumberLength = 4;
    uint256 constant TxTypeLength = 1;
    uint256 constant TxOutputNumberLength = 1;
    uint256 constant PreviousHashLength = 32;
    uint256 constant MerkleRootHashLength = 32;
    uint256 constant TxAmountLength = 32;

    uint256 TransactionOutputLength = 20 + TxOutputNumberLength + TxAmountLength;
    uint256 TransactionInputLength = BlockNumberLength + TxNumberLength + TxOutputNumberLength + TxAmountLength;
    uint256 TxMainLength = TxNumberLength + TxTypeLength + SignatureLength;

    uint256[6] TxLengthForType = [0,
        TxMainLength + 1*TransactionInputLength + 2*TransactionOutputLength,
        TxMainLength + 2*TransactionInputLength + 1*TransactionOutputLength,
        TxMainLength + 1*TransactionInputLength + 1*TransactionOutputLength,
        TxMainLength + 1*TransactionInputLength + 2*TransactionOutputLength,
        TxMainLength + 1*TransactionInputLength + 1*TransactionOutputLength];

    mapping (uint256 => mapping(uint256 => DepositRecord)) public depositRecords;
    mapping (uint256 => mapping(uint256 => WithdrawRecord)) public withdrawRecords;
    mapping (uint256 => Header) public headers;
    event DepositEvent(address indexed _from, uint256 indexed _amount, uint256 indexed _depositIndex);
    event DepositWithdrawStartedEvent(uint256 indexed _depositIndex);
    event DepositWithdrawChallengedEvent(uint256 indexed _depositIndex);
    event DepositWithdrawCompletedEvent(uint256 indexed _depositIndex);

    event WithdrawStartedEvent(uint32 indexed _blockNumber,
                                uint32 indexed _txNumberInBlock,
                                uint8 indexed _outputNumberInTX);
    event WithdrawRequestAcceptedEvent(address indexed _from,
                                uint256 indexed _withdrawIndex);
    event WithdrawFinalizedEvent(uint32 indexed _blockNumber,
                                uint32 indexed _txNumberInBlock,
                                uint8 indexed _outputNumberInTX);       
                                
    event Debug(bool indexed _success, bytes32 indexed _b, address indexed _signer);
    event DebugUint(uint256 indexed _1, uint256 indexed _2, uint256 indexed _3);
    event SigEvent(address indexed _signer, bytes32 indexed _r, bytes32 indexed _s);

    function extract32(bytes data, uint pos) pure internal returns (bytes32 result) { 
        for (uint256 i = 0; i < 32; i++) {
            result ^= (bytes32(0xff00000000000000000000000000000000000000000000000000000000000000)&data[i+pos])>>(i*8);
        }   
    }
    
    function extract20(bytes data, uint pos) pure internal returns (bytes20 result) { 
        for (uint256 i = 0; i < 20; i++) {
            result ^= (bytes20(0xff00000000000000000000000000000000000000)&data[i+pos])>>(i*8);
        }
    }
    
   function extract4(bytes data, uint pos) pure internal returns (bytes4 result) { 
        for (uint256 i = 0; i < 4; i++) {
            result ^= (bytes4(0xff000000)&data[i+pos])>>(i*8);
        }
    }

    function extract2(bytes data, uint pos) pure internal returns (bytes2  result) { 
        for (uint256 i = 0; i < 2; i++) {
            result ^= (bytes2(0xff00)&data[i+pos])>>(i*8);
        }
    }

    function extract1(bytes data, uint pos) pure internal returns (bytes1  result) { 
        for (uint256 i = 0; i < 1; i++) {
            result ^= (bytes1(0xff)&data[i+pos])>>(i*8);
        }
    }    
    
    function submitBlockHeader(bytes header) public returns (bool success) {
        require(msg.sender == operator);
        require(header.length == blockHeaderLength);
        uint32 blockNumber = uint32(extract4(header, 0));
        uint32 numTransactions = uint32(extract4(header, BlockNumberLength));
        bytes32 previousBlockHash = extract32(header, BlockNumberLength + TxNumberLength);
        bytes32 merkleRootHash = extract32(header, BlockNumberLength + TxNumberLength + PreviousHashLength);
        uint8 v = uint8(extract1(header, BlockNumberLength + TxNumberLength + PreviousHashLength + MerkleRootHashLength));
        bytes32 r = extract32(header, BlockNumberLength + TxNumberLength + PreviousHashLength + MerkleRootHashLength + 1);
        bytes32 s = extract32(header, BlockNumberLength + TxNumberLength + PreviousHashLength + MerkleRootHashLength + 33);
        uint256 newBlockNumber = uint256(uint32(blockNumber));
 
        require(newBlockNumber == lastBlockNumber+1);
        if (lastBlockNumber != 0) {
            Header storage previousHeader = headers[lastBlockNumber];
            bytes32 previousHash = keccak256(previousHeader.blockNumber, previousHeader.numTransactions, previousHeader.previousBlockHash, previousHeader.merkleRootHash,
                                                previousHeader.v, previousHeader.r,previousHeader.s);
            require(previousHash == previousBlockHash);
        }
        bytes32 newBlockHash = keccak256(blockNumber, numTransactions, previousBlockHash, merkleRootHash);
        if (v < 27) {
            v = v+27; 
        }
        address signer = ecrecover(newBlockHash, v, r, s);
        SigEvent(signer, r, s);
        if (signer != operator) {
            // revert();
        }
        Header memory newHeader = Header({
            blockNumber: blockNumber,
            numTransactions: numTransactions,
            previousBlockHash: previousBlockHash,
            merkleRootHash: merkleRootHash,
            v: v,
            r: r,
            s: s
        });
        lastBlockNumber = lastBlockNumber+1;
        headers[lastBlockNumber] = newHeader;
        return true;
    }
    
    function createPersonalMessageTypeHash(bytes memory message) internal view returns (bytes32 msgHash) {
        bytes memory prefixBytes = "\x19Ethereum Signed Message:\n";
        bytes memory lengthBytes = message.length.uintToBytes();
        bytes memory prefix = prefixBytes.concat(lengthBytes);
        return keccak256(prefix, message);
    }
    
    function recoverTXsigner(bytes memory txData, uint8 v, bytes32 r, bytes32 s, uint256 txType) internal view returns (address signer) {
        bytes memory sliceNoNumberNoSignatureParts = txData.slice(TxNumberLength, TxLengthForType[txType] - SignatureLength).toBytes();
        bytes32 persMessageHashWithoutNumber = createPersonalMessageTypeHash(sliceNoNumberNoSignatureParts);
        signer = ecrecover(persMessageHashWithoutNumber, v, r, s);
        return signer;
    }

    function checkProof(bytes32 root, bytes data, bytes proof, bool convertToMessageHash) view public returns (bool) {
        bytes32 h;
        if (convertToMessageHash) {
            h = createPersonalMessageTypeHash(data);
        } else {
            h = keccak256(data);
        }
        bytes32 elProvided;
        uint8 rightElementProvided;
        uint32 loc;
        uint32 elLoc;
        for (uint32 i = 32; i <= uint32(proof.length); i += 33) {
            assembly {
                loc  := proof 
                elLoc := add(loc, add(i, 1))
                elProvided := mload(elLoc)
            }
            rightElementProvided = uint8(bytes1(0xff)&proof[i-32]);
            if (rightElementProvided > 0) {
                h = keccak256(h, elProvided);
            } else {
                h = keccak256(elProvided, h);
            }
        }
        return h == root;
      }
    
    function deposit() payable public returns (uint256 idx) {
        if (block.number != lastEthBlockNumber) {
            depositCounterInBlock = 0;
        }
        uint256 depositIndex = block.number << 32 + depositCounterInBlock;
        DepositRecord storage record = depositRecords[0][depositIndex];
        require(record.index == 0);
        require(record.status == DepositStatus.NoRecord);
        record.index = depositIndex;
        record.from = msg.sender;
        record.amount = msg.value;
        record.status = DepositStatus.Deposited;
        depositCounterInBlock = depositCounterInBlock + 1;
        DepositEvent(msg.sender, msg.value, depositIndex);
        return depositIndex;
    }

    function startDepositWithdraw(uint256 depositIndex) public returns (bool success) {
        DepositRecord storage record = depositRecords[0][depositIndex];
        require(record.index == depositIndex);
        require(record.status == DepositStatus.Deposited);
        require(record.from == msg.sender);
        record.status = DepositStatus.WithdrawStarted;
        record.withdrawStartedTime = now;
        DepositWithdrawStartedEvent(depositIndex);
        return true;
    }

    function finalizeDepositWithdraw(uint256 depositIndex) public returns (bool success) {
        DepositRecord storage record = depositRecords[0][depositIndex];
        require(record.index == depositIndex);
        require(record.status == DepositStatus.WithdrawStarted);
        require(now >= record.withdrawStartedTime + (24 hours));
        record.status = DepositStatus.WithdrawCompleted;
        DepositWithdrawCompletedEvent(depositIndex);
        record.from.transfer(record.amount);
        return true;
    }

    function challengeDepositWithdraw(uint256 depositIndex,
                            uint32 _plasmaBlockNumber, 
                            bytes _plasmaTransaction, 
                            bytes _merkleProof) public returns (bool success) {
        DepositRecord storage record = depositRecords[0][depositIndex];
        require(record.index == depositIndex);
        require(record.status == DepositStatus.WithdrawStarted);
        record.status = DepositStatus.WithdrawChallenged;
        Header storage header = headers[uint256(_plasmaBlockNumber)];
        require(uint32(header.blockNumber) > 0);
        bool validProof = checkProof(header.merkleRootHash, _plasmaTransaction, _merkleProof, true);
        require(validProof);
        PlasmaTransaction memory TX = plasmaTransactionFromBytes(_plasmaTransaction);
        require(TX.txType == TxTypeFund);
        address signer = recoverTXsigner(_plasmaTransaction, TX.v, TX.r, TX.s, TX.txType);
        require(signer == operator);
        TransactionOutput memory output0 = TX.outputs[0];
        TransactionOutput memory output1 = TX.outputs[1];
        require(output0.recipient == record.from);
        require(output0.amount == record.amount);
        require(output1.outputNumberInTX == 255);
        require(output1.amount == depositIndex);
        record.status = DepositStatus.DepositConfirmed;
        DepositWithdrawChallengedEvent(depositIndex);
        return true;
    }
    
    function startWithdraw(uint32 _plasmaBlockNumber, //references and proves ownership on output of original transaction
                            uint32 _plasmaTxNumInBlock, 
                            uint8 _outputNumber,
                            bytes _plasmaTransaction, 
                            bytes _merkleProof) 
    public returns(bool success, uint256 withdrawIndex) {
        Header storage header = headers[uint256(_plasmaBlockNumber)];
        require(uint32(header.blockNumber) > 0);
        bool validProof = checkProof(header.merkleRootHash, _plasmaTransaction, _merkleProof, true);
        require(validProof);
        PlasmaTransaction memory TX = plasmaTransactionFromBytes(_plasmaTransaction);
        require(TX.txType != TxTypeWithdraw);
        address signer = recoverTXsigner(_plasmaTransaction, TX.v, TX.r, TX.s, TX.txType);
        require(signer != address(0));
        TransactionOutput memory output = TX.outputs[_outputNumber];
        require(output.recipient == msg.sender);
        require(output.outputNumberInTX != 255);
        WithdrawRecord storage record = populateWithdrawRecordFromOutput(output, _plasmaBlockNumber, _plasmaTxNumInBlock, _outputNumber);
        record.beneficiary = output.recipient;
        record.timeEnded = now;
        WithdrawRequestAcceptedEvent(output.recipient, record.index);
        WithdrawStartedEvent(_plasmaBlockNumber, _plasmaTxNumInBlock, _outputNumber);
        
        return (true, withdrawIndex);
    } 


    function finalizeWithdrawExpress(uint32 _plasmaBlockNumber, //references and proves ownership on withdraw transaction
                            uint32 _plasmaTxNumInBlock, 
                            bytes _plasmaTransaction, 
                            bytes _merkleProof) 
    public returns(bool success, uint256 withdrawIndex) {
        Header storage header = headers[uint256(_plasmaBlockNumber)];
        require(uint32(header.blockNumber) > 0);
        bool validProof = checkProof(header.merkleRootHash, _plasmaTransaction, _merkleProof, true);
        require(validProof);
        PlasmaTransaction memory TX = plasmaTransactionFromBytes(_plasmaTransaction);
        require(TX.txType == TxTypeWithdraw);
        address signer = recoverTXsigner(_plasmaTransaction, TX.v, TX.r, TX.s, TX.txType);
        require(signer == msg.sender);
        TransactionInput memory input = TX.inputs[0];
        WithdrawRecord storage record = getWithdrawRecordForInput(input);
        require(record.beneficiary == signer);
        require(record.status == WithdrawStatus.Started);
        record.status = WithdrawStatus.Completed;
        record.isExpress = true;
        record.timeEnded = now;
        WithdrawFinalizedEvent(input.blockNumber, input.txNumberInBlock, input.outputNumberInTX);
        
        signer.transfer(record.amount);
        return (true, withdrawIndex);
    } 

    function getWithdrawRecordForInput(TransactionInput memory _input) internal returns (WithdrawRecord storage record) {
        uint256 withdrawIndex = uint256(_input.blockNumber) << ((TxNumberLength + TxTypeLength)*8) + uint256(_input.txNumberInBlock) << (TxTypeLength*8) + uint256(_input.outputNumberInTX);
        record = withdrawRecords[0][withdrawIndex];
        require(record.index == withdrawIndex);
        require(record.blockNumber == _input.blockNumber);
        require(record.txNumberInBlock == _input.txNumberInBlock);
        require(record.outputNumberInTX == _input.outputNumberInTX);
        require(record.amount == _input.amount);
        return record;
    }

    function populateWithdrawRecordForInput(TransactionInput memory _input) internal returns (WithdrawRecord storage record) {
        uint256 withdrawIndex = uint256(_input.blockNumber) << ((TxNumberLength + TxTypeLength)*8) + uint256(_input.txNumberInBlock) << (TxTypeLength*8) + uint256(_input.outputNumberInTX);
        record = withdrawRecords[0][withdrawIndex];
        require(record.status == WithdrawStatus.NoRecord);
        record.index = withdrawIndex;
        record.blockNumber = _input.blockNumber;
        record.txNumberInBlock = _input.txNumberInBlock;
        record.outputNumberInTX = _input.outputNumberInTX;
        record.status = WithdrawStatus.Started;
        record.amount = _input.amount;
        record.timeStarted = now;
        return record;
    }

    function populateWithdrawRecordFromOutput(TransactionOutput memory _output, uint32 _blockNumber, uint32 _txNumberInBlock, uint8 _outputNumberInTX) internal returns (WithdrawRecord storage record) {
        uint256 withdrawIndex = uint256(_blockNumber) << ((TxNumberLength + TxTypeLength)*8) + uint256(_txNumberInBlock) << (TxTypeLength*8) + uint256(_outputNumberInTX);
        record = withdrawRecords[0][withdrawIndex];
        require(record.status == WithdrawStatus.NoRecord);
        record.index = withdrawIndex;
        record.status = WithdrawStatus.Started;
        record.amount = _output.amount;
        record.timeStarted = now;
        record.blockNumber = _blockNumber;
        record.txNumberInBlock = _txNumberInBlock;
        record.outputNumberInTX = _outputNumberInTX;
        return record;
    }

    function finalizeWithdraw(uint256 withdrawIndex) public returns(bool success) {
        WithdrawRecord storage record = withdrawRecords[0][withdrawIndex];
        require(record.status == WithdrawStatus.Started);
        require(now >= record.timeStarted + (24 hours));
        address to = record.beneficiary;
        record.status = WithdrawStatus.Completed;
        record.timeEnded = now;
        WithdrawFinalizedEvent(record.blockNumber, record.txNumberInBlock, record.outputNumberInTX);
        to.transfer(record.amount);
        return true;
    } 

    function plasmaTransactionFromBytes(bytes _rawTX) internal view returns (PlasmaTransaction memory TX) {
        uint8 txType = uint8(extract1(_rawTX, TxNumberLength));
        uint256 expectedLength = TxLengthForType[txType];
        require(_rawTX.length == expectedLength);
        uint256 numInputs = NumInputsForType[txType];
        uint256 numOutputs = NumOutputsForType[txType];
        uint32 numInBlock = uint32(extract4(_rawTX,0));
        uint256 signatureOffset = TxNumberLength + TxTypeLength + numInputs*TransactionInputLength + numOutputs*TransactionOutputLength;
        uint8 v = uint8(extract1(_rawTX, signatureOffset));
        bytes32 r = extract32(_rawTX, signatureOffset + 1);
        bytes32 s = extract32(_rawTX, signatureOffset + 33);
        TX = PlasmaTransaction({
            txNumberInBlock: numInBlock,
            txType: txType,
            inputs: new TransactionInput[](numInputs),
            outputs: new TransactionOutput[](numOutputs),
            v : v,
            r: r,
            s: s
        });
        bytes memory insAndOutsSlice = _rawTX.slice(TxNumberLength + TxTypeLength, signatureOffset).toBytes();
        assert(populateInsAndOuts(TX, numInputs, numOutputs, insAndOutsSlice));
        return TX;
    }

    function populateInsAndOuts(PlasmaTransaction memory _TX, uint256 _numIns, uint256 _numOuts, bytes memory _insAndOutsSlice) 
        internal view returns (bool success) {
            uint i;
            for (i = 0; i < _numIns; i++) {
                bytes memory rawInput = _insAndOutsSlice.slice(i*TransactionInputLength, (i+1)*TransactionInputLength).toBytes();
                TransactionInput memory input = transactionInputFromBytes(rawInput);
                _TX.inputs[i] = input;
            }
            for (i = 0; i < _numOuts; i++) {
                bytes memory rawOutput = _insAndOutsSlice.slice(_numIns*TransactionInputLength + i*TransactionOutputLength, 
                                                _numIns*TransactionInputLength + (i+1)*TransactionOutputLength).toBytes();
                TransactionOutput memory output = transactionOutputFromBytes(rawOutput);
                if (output.outputNumberInTX == 255){
                    continue;
                }
                require(output.outputNumberInTX == i);
                _TX.outputs[i] = output;
            }
            return true;
    }

    function transactionInputFromBytes(bytes _rawInput) internal view returns(TransactionInput memory input) {
        require(_rawInput.length == TransactionInputLength);
        uint32 blockNumber = uint32(extract4(_rawInput,0));
        uint32 txNumberInBlock = uint32(extract4(_rawInput, BlockNumberLength));
        uint8 outputNumberInTX = uint8(extract1(_rawInput, BlockNumberLength + TxNumberLength));
        uint256 amount = uint256(extract32(_rawInput, BlockNumberLength + TxNumberLength + TxOutputNumberLength));
        input = TransactionInput({
            blockNumber: blockNumber,
            txNumberInBlock: txNumberInBlock,
            outputNumberInTX: outputNumberInTX,
            amount: amount
        });
        return input;
    }

    function transactionOutputFromBytes(bytes _rawOutput) internal view returns(TransactionOutput memory output) {
        require(_rawOutput.length == TransactionOutputLength);
        address recipient = address(extract20(_rawOutput, 0));
        uint8 outputNumberInTX = uint8(extract1(_rawOutput, 20));
        uint256 amount = uint256(extract32(_rawOutput, 20 + TxOutputNumberLength));
        output = TransactionOutput({
            recipient: recipient,
            outputNumberInTX: outputNumberInTX,
            amount: amount
        });
        return output;
    }

}

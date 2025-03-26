// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private firstValue;
    uint256 private secondValue;
    uint256 private writeCount;

    event DebugLog(string message);
    event FirstChanged(uint256 newValue, uint256 writeCount);
    event SecondChanged(uint256 newValue, uint256 writeCount);

    function setFirst(uint256 newValue) public {
        emit DebugLog("setFirst called!");
        firstValue = newValue;
        writeCount += 1;
        emit FirstChanged(newValue, writeCount);
    }

    function setSecond(uint256 newValue) public {
        emit DebugLog("setSecond called!");
        secondValue = newValue;
        writeCount += 1;
        emit SecondChanged(newValue, writeCount);
    }

    function getFirst() public view returns (uint256 firstValue) {
        return firstValue;
    }
    function getSecond() public view returns (uint256 secondValue) {
        return secondValue;
    }

    function getBoth() public view returns (uint256 firstValue, uint256 secondValue) {
        return (firstValue, secondValue);
    }

    function getWriteCount() public view returns (uint256) {  // unnamed return
        return writeCount;
    }
}
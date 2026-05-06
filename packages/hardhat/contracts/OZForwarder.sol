//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/**
 * @title OZForwarder
 * @dev Wrapper contract for OpenZeppelin's ERC2771Forwarder
 * This allows us to deploy and test the OpenZeppelin forwarder
 * while maintaining compatibility with our deployment scripts
 */
contract OZForwarder is ERC2771Forwarder {
    constructor(string memory name) ERC2771Forwarder(name) {}
}

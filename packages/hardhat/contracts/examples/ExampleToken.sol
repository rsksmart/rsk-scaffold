//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title ExampleToken
 * @notice A simple fixed-supply ERC-20 token for educational purposes
 * @dev Mints entire supply to deployer on construction
 */
contract ExampleToken is ERC20 {
    /**
     * @notice Creates the token with a fixed initial supply
     * @param initialSupply The total supply of tokens to mint (in wei units)
     */
    constructor(uint256 initialSupply) ERC20("ExampleToken", "EXT") {
        _mint(msg.sender, initialSupply);
    }
}
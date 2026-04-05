// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * TokenDemo
 * - Simple ERC20 token with owner-only mint for demo purposes
 */
contract TokenDemo is ERC20, Ownable {
	constructor() ERC20("DemoToken", "DEMO") Ownable(msg.sender) {}

	function mint(address to, uint256 amount) external onlyOwner {
		_mint(to, amount);
	}
}


//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/**
 * @title ExampleTarget
 * @dev DEMONSTRATION CONTRACT ONLY - NOT FOR PRODUCTION USE
 * This is a simple example contract for demonstrating meta-transaction functionality.
 * It allows users to add points to their account without any meaningful business logic.
 * WARNING: This contract lacks proper access controls and economic safeguards.
 */
contract ExampleTarget is ERC2771Context {
    mapping(address => uint256) public points;
    
    // Maximum points that can be added in a single transaction
    uint256 public constant MAX_POINTS_PER_TX = 1000 * 10**18; // 1000 points with 18 decimals

    event PointsAdded(address indexed user, uint256 amount, uint256 newTotal);

    constructor(address trustedForwarder) ERC2771Context(trustedForwarder) {}

    /**
     * @dev Add points to the caller's account
     * @param amount The amount of points to add (must be <= MAX_POINTS_PER_TX)
     */
    function addPoints(uint256 amount) public {
        require(amount <= MAX_POINTS_PER_TX, "Exceeds maximum points per transaction");
        
        address user = _msgSender();
        points[user] += amount;
        
        emit PointsAdded(user, amount, points[user]);
    }

    function getPoints(address user) public view returns (uint256) {
        return points[user];
    }
}

//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleNFT
 * @notice A simple ERC-721 NFT contract for educational purposes
 * @dev Anyone can mint NFTs with auto-incrementing token IDs
 */
contract SimpleNFT is ERC721, Ownable {
    uint256 public nextId;

    event NFTMinted(address indexed to, uint256 indexed tokenId);

    /**
     * @notice Creates the NFT collection
     */
    constructor() ERC721("ExampleNFT", "ENFT") Ownable(msg.sender) {}

    /**
     * @notice Mints a new NFT to the specified address
     * @param to The address that will receive the NFT
     * @return The ID of the newly minted NFT
     */
    function mint(address to) external returns (uint256) {
        uint256 tokenId = nextId;
        nextId++;
        _safeMint(to, tokenId);
        emit NFTMinted(to, tokenId);
        return tokenId;
    }

    /**
     * @notice Returns the total number of NFTs minted
     * @return The total supply of NFTs
     */
    function totalSupply() external view returns (uint256) {
        return nextId;
    }
}
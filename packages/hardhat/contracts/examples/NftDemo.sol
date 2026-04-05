// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * NftDemo
 * - Simple ERC721 with sequential token IDs and owner-only mint
 */
contract NftDemo is ERC721, Ownable {
	using Counters for Counters.Counter;
	Counters.Counter private _tokenIdCounter;

	string public baseTokenUri;

	constructor(string memory _baseTokenUri) ERC721("DemoNFT", "DNFT") Ownable(msg.sender) {
		baseTokenUri = _baseTokenUri;
	}

	function setBaseTokenUri(string calldata _baseTokenUri) external onlyOwner {
		baseTokenUri = _baseTokenUri;
	}

	function safeMint(address to) external onlyOwner returns (uint256) {
		_tokenIdCounter.increment();
		uint256 tokenId = _tokenIdCounter.current();
		_safeMint(to, tokenId);
		return tokenId;
	}

	function _baseURI() internal view override returns (string memory) {
		return baseTokenUri;
	}
}


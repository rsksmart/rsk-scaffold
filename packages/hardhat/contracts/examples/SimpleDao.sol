// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * SimpleDao
 * - Create simple yes/no proposals with deadlines
 * - Each address can vote once per proposal
 * - Optionally, votes can be weighted by a provided ERC20 balance snapshot at vote time
 *   For simplicity, we pass a token address in constructor; if zero address, all votes weight = 1
 */
interface IERC20Balance {
	function balanceOf(address account) external view returns (uint256);
}

contract SimpleDao {
	struct Proposal {
		string description;
		uint256 deadline;
		uint256 yesVotes;
		uint256 noVotes;
		bool executed;
		mapping(address => bool) hasVoted;
	}

	address public chairperson;
	IERC20Balance public governanceToken; // optional; zero address means 1-person-1-vote

	mapping(uint256 => Proposal) private proposals;
	uint256 public proposalsCount;

	event ProposalCreated(uint256 indexed proposalId, string description, uint256 deadline);
	event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
	event Executed(uint256 indexed proposalId, bool passed);

	modifier onlyChair() {
		require(msg.sender == chairperson, "Only chair");
		_;
	}

	constructor(address _token) {
		chairperson = msg.sender;
		governanceToken = IERC20Balance(_token);
	}

	function createProposal(string calldata description, uint256 votingPeriodSeconds) external onlyChair returns (uint256) {
		require(votingPeriodSeconds > 0, "Period must be > 0");
		uint256 id = proposalsCount;
		proposalsCount = id + 1;
		Proposal storage p = proposals[id];
		p.description = description;
		p.deadline = block.timestamp + votingPeriodSeconds;
		emit ProposalCreated(id, description, p.deadline);
		return id;
	}

	function vote(uint256 proposalId, bool support) external {
		Proposal storage p = proposals[proposalId];
		require(bytes(p.description).length != 0, "No proposal");
		require(block.timestamp < p.deadline, "Voting ended");
		require(!p.hasVoted[msg.sender], "Already voted");
		p.hasVoted[msg.sender] = true;

		uint256 weight = address(governanceToken) == address(0) ? 1 : governanceToken.balanceOf(msg.sender);
		if (support) {
			p.yesVotes += weight;
		} else {
			p.noVotes += weight;
		}
		emit Voted(proposalId, msg.sender, support, weight);
	}

	function execute(uint256 proposalId) external onlyChair returns (bool passed) {
		Proposal storage p = proposals[proposalId];
		require(bytes(p.description).length != 0, "No proposal");
		require(block.timestamp >= p.deadline, "Voting not ended");
		require(!p.executed, "Already executed");
		p.executed = true;
		passed = p.yesVotes > p.noVotes;
		emit Executed(proposalId, passed);
	}

	function getProposal(uint256 proposalId)
		external
		view
		returns (string memory description, uint256 deadline, uint256 yesVotes, uint256 noVotes, bool executed)
	{
		Proposal storage p = proposals[proposalId];
		require(bytes(p.description).length != 0, "No proposal");
		return (p.description, p.deadline, p.yesVotes, p.noVotes, p.executed);
	}
}


//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SimpleDAO
 * @notice A minimal DAO contract for educational purposes
 * @dev Demonstrates basic governance: voting power assignment, proposals, voting, and execution
 */
contract SimpleDAO {
    struct Proposal {
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        uint256 createdAt;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public votingPower;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    uint256 public proposalCount;

    address public owner;

    event VotingPowerSet(address indexed user, uint256 power);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 power);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    /**
     * @notice Sets voting power for a user (only owner)
     * @param user The address to set voting power for
     * @param power The voting power to assign
     */
    function setVotingPower(address user, uint256 power) external onlyOwner {
        votingPower[user] = power;
        emit VotingPowerSet(user, power);
    }

    /**
     * @notice Creates a new proposal
     * @param description The description of the proposal
     * @return The ID of the created proposal
     */
    function propose(string calldata description) external returns (uint256) {
        require(bytes(description).length > 0, "Description cannot be empty");
        
        uint256 proposalId = proposalCount;
        proposals[proposalId] = Proposal({
            description: description,
            votesFor: 0,
            votesAgainst: 0,
            executed: false,
            createdAt: block.timestamp
        });
        proposalCount++;
        
        emit ProposalCreated(proposalId, msg.sender, description);
        return proposalId;
    }

    /**
     * @notice Vote on a proposal
     * @param proposalId The ID of the proposal to vote on
     * @param support True to vote for, false to vote against
     */
    function vote(uint256 proposalId, bool support) external {
        require(proposalId < proposalCount, "Proposal does not exist");
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Proposal already executed");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        
        uint256 power = votingPower[msg.sender];
        require(power > 0, "No voting power");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.votesFor += power;
        } else {
            proposal.votesAgainst += power;
        }

        emit Voted(proposalId, msg.sender, support, power);
    }

    /**
     * @notice Execute a proposal if it has passed
     * @param proposalId The ID of the proposal to execute
     */
    function execute(uint256 proposalId) external {
        require(proposalId < proposalCount, "Proposal does not exist");
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Proposal already executed");
        require(proposal.votesFor > proposal.votesAgainst, "Proposal has not passed");

        proposal.executed = true;
        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice Get proposal details
     * @param proposalId The ID of the proposal
     * @return description The proposal description
     * @return votesFor Total votes in favor
     * @return votesAgainst Total votes against
     * @return executed Whether the proposal has been executed
     * @return createdAt Timestamp when proposal was created
     */
    function getProposal(uint256 proposalId) external view returns (
        string memory description,
        uint256 votesFor,
        uint256 votesAgainst,
        bool executed,
        uint256 createdAt
    ) {
        require(proposalId < proposalCount, "Proposal does not exist");
        Proposal memory proposal = proposals[proposalId];
        return (
            proposal.description,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.executed,
            proposal.createdAt
        );
    }
}
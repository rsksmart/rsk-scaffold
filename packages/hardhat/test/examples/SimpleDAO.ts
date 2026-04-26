import { expect } from "chai";
import { ethers } from "hardhat";
import { SimpleDAO } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SimpleDAO", function () {
  let simpleDAO: SimpleDAO;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;
  let addr3: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const simpleDAOFactory = await ethers.getContractFactory("SimpleDAO");
    simpleDAO = (await simpleDAOFactory.deploy()) as SimpleDAO;
    await simpleDAO.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await simpleDAO.owner()).to.equal(owner.address);
    });

    it("Should start with 0 proposals", async function () {
      expect(await simpleDAO.proposalCount()).to.equal(0);
    });
  });

  describe("Voting Power", function () {
    it("Should allow owner to set voting power", async function () {
      await simpleDAO.setVotingPower(addr1.address, 100);
      expect(await simpleDAO.votingPower(addr1.address)).to.equal(100);
    });

    it("Should emit VotingPowerSet event", async function () {
      await expect(simpleDAO.setVotingPower(addr1.address, 100))
        .to.emit(simpleDAO, "VotingPowerSet")
        .withArgs(addr1.address, 100);
    });

    it("Should not allow non-owner to set voting power", async function () {
      await expect(simpleDAO.connect(addr1).setVotingPower(addr2.address, 100)).to.be.revertedWith(
        "Only owner can call this",
      );
    });
  });

  describe("Proposals", function () {
    it("Should create a proposal", async function () {
      const description = "Test Proposal";
      await simpleDAO.propose(description);

      const proposal = await simpleDAO.getProposal(0);
      expect(proposal.description).to.equal(description);
      expect(proposal.votesFor).to.equal(0);
      expect(proposal.votesAgainst).to.equal(0);
      expect(proposal.executed).to.equal(false);
      expect(await simpleDAO.proposalCount()).to.equal(1);
    });

    it("Should emit ProposalCreated event", async function () {
      const description = "Test Proposal";
      await expect(simpleDAO.propose(description))
        .to.emit(simpleDAO, "ProposalCreated")
        .withArgs(0, owner.address, description);
    });

    it("Should not allow empty description", async function () {
      await expect(simpleDAO.propose("")).to.be.revertedWith("Description cannot be empty");
    });

    it("Should increment proposal count", async function () {
      await simpleDAO.propose("Proposal 1");
      await simpleDAO.propose("Proposal 2");
      expect(await simpleDAO.proposalCount()).to.equal(2);
    });
  });

  describe("Voting", function () {
    beforeEach(async () => {
      // Set voting power for test accounts
      await simpleDAO.setVotingPower(addr1.address, 100);
      await simpleDAO.setVotingPower(addr2.address, 50);
      await simpleDAO.setVotingPower(addr3.address, 75);

      // Create a proposal
      await simpleDAO.propose("Test Proposal");
    });

    it("Should allow voting with voting power", async function () {
      await simpleDAO.connect(addr1).vote(0, true);

      const proposal = await simpleDAO.getProposal(0);
      expect(proposal.votesFor).to.equal(100);
      expect(proposal.votesAgainst).to.equal(0);
    });

    it("Should tally votes correctly", async function () {
      await simpleDAO.connect(addr1).vote(0, true);
      await simpleDAO.connect(addr2).vote(0, false);
      await simpleDAO.connect(addr3).vote(0, true);

      const proposal = await simpleDAO.getProposal(0);
      expect(proposal.votesFor).to.equal(175); // 100 + 75
      expect(proposal.votesAgainst).to.equal(50);
    });

    it("Should emit Voted event", async function () {
      await expect(simpleDAO.connect(addr1).vote(0, true))
        .to.emit(simpleDAO, "Voted")
        .withArgs(0, addr1.address, true, 100);
    });

    it("Should not allow voting without voting power", async function () {
      const [, , , , noVotingPower] = await ethers.getSigners();
      await expect(simpleDAO.connect(noVotingPower).vote(0, true)).to.be.revertedWith("No voting power");
    });

    it("Should not allow voting twice", async function () {
      await simpleDAO.connect(addr1).vote(0, true);
      await expect(simpleDAO.connect(addr1).vote(0, true)).to.be.revertedWith("Already voted");
    });

    it("Should not allow voting on executed proposal", async function () {
      await simpleDAO.connect(addr1).vote(0, true);
      await simpleDAO.execute(0);

      await expect(simpleDAO.connect(addr2).vote(0, true)).to.be.revertedWith("Proposal already executed");
    });

    it("Should not allow voting on non-existent proposal", async function () {
      await expect(simpleDAO.connect(addr1).vote(999, true)).to.be.revertedWith("Proposal does not exist");
    });
  });

  describe("Execution", function () {
    beforeEach(async () => {
      await simpleDAO.setVotingPower(addr1.address, 100);
      await simpleDAO.setVotingPower(addr2.address, 50);
      await simpleDAO.propose("Test Proposal");
    });

    it("Should execute proposal when votesFor > votesAgainst", async function () {
      await simpleDAO.connect(addr1).vote(0, true);
      await simpleDAO.connect(addr2).vote(0, false);

      await simpleDAO.execute(0);

      const proposal = await simpleDAO.getProposal(0);
      expect(proposal.executed).to.equal(true);
    });

    it("Should emit ProposalExecuted event", async function () {
      await simpleDAO.connect(addr1).vote(0, true);

      await expect(simpleDAO.execute(0)).to.emit(simpleDAO, "ProposalExecuted").withArgs(0);
    });

    it("Should not execute if votesAgainst >= votesFor", async function () {
      await simpleDAO.connect(addr1).vote(0, false);
      await simpleDAO.connect(addr2).vote(0, true);

      await expect(simpleDAO.execute(0)).to.be.revertedWith("Proposal has not passed");
    });

    it("Should not execute already executed proposal", async function () {
      await simpleDAO.connect(addr1).vote(0, true);
      await simpleDAO.execute(0);

      await expect(simpleDAO.execute(0)).to.be.revertedWith("Proposal already executed");
    });

    it("Should not execute non-existent proposal", async function () {
      await expect(simpleDAO.execute(999)).to.be.revertedWith("Proposal does not exist");
    });
  });
});
import { expect } from "chai";
import { ethers } from "hardhat";
import { SimpleNFT } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SimpleNFT", function () {
  let simpleNFT: SimpleNFT;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    const simpleNFTFactory = await ethers.getContractFactory("SimpleNFT");
    simpleNFT = (await simpleNFTFactory.deploy()) as SimpleNFT;
    await simpleNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right NFT name and symbol", async function () {
      expect(await simpleNFT.name()).to.equal("ExampleNFT");
      expect(await simpleNFT.symbol()).to.equal("ENFT");
    });

    it("Should set the right owner", async function () {
      expect(await simpleNFT.owner()).to.equal(owner.address);
    });

    it("Should start with nextId at 0", async function () {
      expect(await simpleNFT.nextId()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should mint NFT with correct ID", async function () {
      await simpleNFT.mint(addr1.address);

      expect(await simpleNFT.ownerOf(0)).to.equal(addr1.address);
      expect(await simpleNFT.nextId()).to.equal(1);
    });

    it("Should increment ID for each mint", async function () {
      await simpleNFT.mint(addr1.address);
      await simpleNFT.mint(addr2.address);
      await simpleNFT.mint(addr1.address);

      expect(await simpleNFT.ownerOf(0)).to.equal(addr1.address);
      expect(await simpleNFT.ownerOf(1)).to.equal(addr2.address);
      expect(await simpleNFT.ownerOf(2)).to.equal(addr1.address);
      expect(await simpleNFT.nextId()).to.equal(3);
    });

    it("Should emit NFTMinted event", async function () {
      await expect(simpleNFT.mint(addr1.address)).to.emit(simpleNFT, "NFTMinted").withArgs(addr1.address, 0);
    });

    it("Should return correct total supply", async function () {
      expect(await simpleNFT.totalSupply()).to.equal(0);

      await simpleNFT.mint(addr1.address);
      expect(await simpleNFT.totalSupply()).to.equal(1);

      await simpleNFT.mint(addr2.address);
      expect(await simpleNFT.totalSupply()).to.equal(2);
    });
  });

  describe("Ownership", function () {
    it("Should allow anyone to mint", async function () {
      await expect(simpleNFT.connect(addr1).mint(addr2.address)).to.not.be.reverted;
      expect(await simpleNFT.ownerOf(0)).to.equal(addr2.address);
    });
  });
});
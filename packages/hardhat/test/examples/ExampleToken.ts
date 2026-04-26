import { expect } from "chai";
import { ethers } from "hardhat";
import { ExampleToken } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ExampleToken", function () {
  let exampleToken: ExampleToken;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;
  const initialSupply = ethers.parseUnits("1000000", 18);

  before(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    const exampleTokenFactory = await ethers.getContractFactory("ExampleToken");
    exampleToken = (await exampleTokenFactory.deploy(initialSupply)) as ExampleToken;
    await exampleToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right token name and symbol", async function () {
      expect(await exampleToken.name()).to.equal("ExampleToken");
      expect(await exampleToken.symbol()).to.equal("EXT");
    });

    it("Should mint initial supply to deployer", async function () {
      const ownerBalance = await exampleToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(initialSupply);
    });

    it("Should have correct total supply", async function () {
      const totalSupply = await exampleToken.totalSupply();
      expect(totalSupply).to.equal(initialSupply);
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseUnits("100", 18);

      await exampleToken.transfer(addr1.address, transferAmount);
      const addr1Balance = await exampleToken.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(transferAmount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialAddr1Balance = await exampleToken.balanceOf(addr1.address);
      const tooMuch = initialAddr1Balance + ethers.parseUnits("1", 18);

      await expect(exampleToken.connect(addr1).transfer(addr2.address, tooMuch)).to.be.reverted;
    });

    it("Should update balances after transfers", async function () {
      const initialOwnerBalance = await exampleToken.balanceOf(owner.address);
      const transferAmount = ethers.parseUnits("50", 18);

      await exampleToken.transfer(addr1.address, transferAmount);
      await exampleToken.transfer(addr2.address, transferAmount);

      const finalOwnerBalance = await exampleToken.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(initialOwnerBalance - transferAmount * 2n);

      const addr1Balance = await exampleToken.balanceOf(addr1.address);
      expect(addr1Balance).to.be.gt(0);

      const addr2Balance = await exampleToken.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(transferAmount);
    });
  });
});
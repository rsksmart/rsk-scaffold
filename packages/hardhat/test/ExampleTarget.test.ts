// Real on-chain assertions for the ExampleTarget contract. Replaces the
// hollow security-fixes.test.ts whose 8/9 tests asserted only on local
// mocks and whose console.log check read a non-existent path.

import { expect } from "chai";
import { ethers } from "hardhat";
import { ExampleTarget } from "../typechain-types";

describe("ExampleTarget", function () {
  let exampleTarget: ExampleTarget;
  let deployer: any;
  let user: any;

  beforeEach(async function () {
    [deployer, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ExampleTarget");
    exampleTarget = await Factory.deploy(deployer.address);
    await exampleTarget.waitForDeployment();
  });

  describe("MAX_POINTS_PER_TX cap", function () {
    it("exposes a fixed 1000-ETH-equivalent cap", async function () {
      const cap = await exampleTarget.MAX_POINTS_PER_TX();
      expect(cap).to.equal(ethers.parseEther("1000"));
    });

    it("accepts addPoints amounts at or below the cap", async function () {
      const amount = ethers.parseEther("100");
      await expect(exampleTarget.connect(user).addPoints(amount))
        .to.emit(exampleTarget, "PointsAdded")
        .withArgs(user.address, amount, amount);
      expect(await exampleTarget.getPoints(user.address)).to.equal(amount);
    });

    it("reverts addPoints amounts above the cap", async function () {
      const cap = await exampleTarget.MAX_POINTS_PER_TX();
      const tooMany = cap + ethers.parseEther("1");
      await expect(exampleTarget.connect(user).addPoints(tooMany)).to.be.revertedWith(
        "Exceeds maximum points per transaction",
      );
    });

    it("reverts addPoints amounts at exactly cap+1", async function () {
      const cap = await exampleTarget.MAX_POINTS_PER_TX();
      await expect(exampleTarget.connect(user).addPoints(cap + 1n)).to.be.revertedWith(
        "Exceeds maximum points per transaction",
      );
    });
  });
});

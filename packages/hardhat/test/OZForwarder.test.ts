import { expect } from "chai";
import { ethers } from "hardhat";
import { ExampleTarget } from "../typechain-types";
import { ERC2771Forwarder } from "../typechain-types/@openzeppelin/contracts/metatx";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { createSignedRequest } from "./helpers/signedRequest";

describe("OpenZeppelin ERC2771Forwarder", function () {
  let forwarder: ERC2771Forwarder;
  let exampleTarget: ExampleTarget;
  let user: SignerWithAddress;
  let relayer: SignerWithAddress;

  beforeEach(async function () {
    const [, userSigner, relayerSigner] = await ethers.getSigners();
    user = userSigner;
    relayer = relayerSigner;

    // Deploy OpenZeppelin ERC2771Forwarder (via our wrapper)
    const ForwarderFactory = await ethers.getContractFactory("OZForwarder");
    forwarder = await ForwarderFactory.deploy("RSKForwarder");
    await forwarder.waitForDeployment();

    // Deploy ExampleTarget with the new forwarder
    const ExampleTargetFactory = await ethers.getContractFactory("ExampleTarget");
    exampleTarget = await ExampleTargetFactory.deploy(await forwarder.getAddress());
    await exampleTarget.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct EIP712 domain", async function () {
      const domain = await forwarder.eip712Domain();
      expect(domain.name).to.equal("RSKForwarder");
      expect(domain.version).to.equal("1");
    });

    it("Should initialize nonces to 0", async function () {
      const nonce = await forwarder.nonces(user.address);
      expect(nonce).to.equal(0);
    });
  });

  describe("Meta-transactions", function () {
    it("Should execute valid meta-transaction", async function () {
      const nonce = await forwarder.nonces(user.address);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const data = exampleTarget.interface.encodeFunctionData("addPoints", [10n]);

      const request = await createSignedRequest(
        forwarder,
        user.address,
        await exampleTarget.getAddress(),
        0n,
        100000n,
        deadline,
        data,
        user,
      );

      await expect(forwarder.connect(relayer).execute(request))
        .to.emit(forwarder, "ExecutedForwardRequest")
        .withArgs(user.address, nonce, true);

      const points = await exampleTarget.getPoints(user.address);
      expect(points).to.equal(10n);

      const newNonce = await forwarder.nonces(user.address);
      expect(newNonce).to.equal(nonce + 1n);
    });

    it("Should reject expired request", async function () {
      const deadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago (expired)
      const data = exampleTarget.interface.encodeFunctionData("addPoints", [10n]);

      const request = await createSignedRequest(
        forwarder,
        user.address,
        await exampleTarget.getAddress(),
        0n,
        100000n,
        deadline,
        data,
        user,
      );

      await expect(forwarder.connect(relayer).execute(request)).to.be.revertedWithCustomError(
        forwarder,
        "ERC2771ForwarderExpiredRequest",
      );
    });

    it("Should reject invalid signature", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const data = exampleTarget.interface.encodeFunctionData("addPoints", [10n]);

      // Create request with invalid signature
      const invalidSignature =
        "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

      const request = {
        from: user.address,
        to: await exampleTarget.getAddress(),
        value: 0n,
        gas: 100000n,
        deadline: deadline,
        data: data,
        signature: invalidSignature,
      };

      await expect(forwarder.connect(relayer).execute(request)).to.be.revertedWithCustomError(
        forwarder,
        "ERC2771ForwarderInvalidSigner",
      );
    });

    it("Should reject replay attacks", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const data = exampleTarget.interface.encodeFunctionData("addPoints", [10n]);

      const request = await createSignedRequest(
        forwarder,
        user.address,
        await exampleTarget.getAddress(),
        0n,
        100000n,
        deadline,
        data,
        user,
      );

      // Execute once
      await forwarder.connect(relayer).execute(request);

      // Try to replay - should fail because signature was signed with old nonce
      // OpenZeppelin checks signature validity which includes nonce, so it fails with InvalidSigner
      await expect(forwarder.connect(relayer).execute(request)).to.be.revertedWithCustomError(
        forwarder,
        "ERC2771ForwarderInvalidSigner",
      );
    });
  });

  describe("Batch Execution", function () {
    it("Should execute batch of meta-transactions", async function () {
      const currentNonce = await forwarder.nonces(user.address);
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const data1 = exampleTarget.interface.encodeFunctionData("addPoints", [10n]);
      const data2 = exampleTarget.interface.encodeFunctionData("addPoints", [20n]);

      // Create first request with explicit nonce
      const request1 = await createSignedRequest(
        forwarder,
        user.address,
        await exampleTarget.getAddress(),
        0n,
        100000n,
        deadline,
        data1,
        user,
        currentNonce, // Explicit nonce for batch
      );

      // Create second request with nonce + 1
      const request2 = await createSignedRequest(
        forwarder,
        user.address,
        await exampleTarget.getAddress(),
        0n,
        100000n,
        deadline,
        data2,
        user,
        currentNonce + 1n, // Explicit nonce for batch
      );

      // Execute batch (refundReceiver can be zero address for atomic execution)
      await forwarder.connect(relayer).executeBatch([request1, request2], ethers.ZeroAddress);

      // Verify both transactions were executed
      const points = await exampleTarget.getPoints(user.address);
      expect(points).to.equal(30n); // 10 + 20

      // Verify nonce was incremented twice
      const newNonce = await forwarder.nonces(user.address);
      expect(newNonce).to.equal(currentNonce + 2n);
    });
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";
import { ExampleTarget } from "../typechain-types";
import { ERC2771Forwarder } from "../typechain-types/@openzeppelin/contracts/metatx";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { createSignedRequest } from "./helpers/signedRequest";

describe("Integration: OpenZeppelin Forwarder Full Flow", function () {
  let forwarder: ERC2771Forwarder;
  let exampleTarget: ExampleTarget;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;
  let relayer: SignerWithAddress;

  beforeEach(async function () {
    const [, userSigner, user2Signer, relayerSigner] = await ethers.getSigners();
    user = userSigner;
    user2 = user2Signer;
    relayer = relayerSigner;

    const ForwarderFactory = await ethers.getContractFactory("OZForwarder");
    forwarder = await ForwarderFactory.deploy("RSKForwarder");
    await forwarder.waitForDeployment();

    const ExampleTargetFactory = await ethers.getContractFactory("ExampleTarget");
    exampleTarget = await ExampleTargetFactory.deploy(await forwarder.getAddress());
    await exampleTarget.waitForDeployment();
  });

  describe("Complete Flow", function () {
    it("Should complete full gasless transaction flow", async function () {
      // 1. Check initial state
      const initialPoints = await exampleTarget.getPoints(user.address);
      expect(initialPoints).to.equal(0n);

      const initialNonce = await forwarder.nonces(user.address);
      expect(initialNonce).to.equal(0n);

      // 2. Create and sign request
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const data = exampleTarget.interface.encodeFunctionData("addPoints", [25n]);

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

      // 3. Verify request
      const isValid = await forwarder.verify(request);
      expect(isValid).to.equal(true);

      // 4. Execute via relayer
      const tx = await forwarder.connect(relayer).execute(request);
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // 5. Verify state changes
      const finalPoints = await exampleTarget.getPoints(user.address);
      expect(finalPoints).to.equal(25n);

      const finalNonce = await forwarder.nonces(user.address);
      expect(finalNonce).to.equal(1n);

      // 6. Verify relayer didn't get points
      const relayerPoints = await exampleTarget.getPoints(relayer.address);
      expect(relayerPoints).to.equal(0n);
    });

    it("Should handle multiple sequential meta-transactions", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      for (let i = 0; i < 5; i++) {
        const data = exampleTarget.interface.encodeFunctionData("addPoints", [5n]);
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

        await forwarder.connect(relayer).execute(request);
      }

      const finalPoints = await exampleTarget.getPoints(user.address);
      expect(finalPoints).to.equal(25n);

      const finalNonce = await forwarder.nonces(user.address);
      expect(finalNonce).to.equal(5n);
    });

    it("Should differentiate between direct and meta-transaction calls", async function () {
      // Direct call
      await exampleTarget.connect(user).addPoints(10n);
      const directPoints = await exampleTarget.getPoints(user.address);
      expect(directPoints).to.equal(10n);

      // Meta-transaction call
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const data = exampleTarget.interface.encodeFunctionData("addPoints", [15n]);
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

      await forwarder.connect(relayer).execute(request);

      const finalPoints = await exampleTarget.getPoints(user.address);
      expect(finalPoints).to.equal(25n);

      // Relayer should have 0 points
      const relayerPoints = await exampleTarget.getPoints(relayer.address);
      expect(relayerPoints).to.equal(0n);
    });
  });

  describe("Batch Execution", function () {
    it("Should execute batch of transactions atomically", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const currentNonce = await forwarder.nonces(user.address);

      // Create multiple requests
      const requests = [];
      for (let i = 0; i < 3; i++) {
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
          currentNonce + BigInt(i),
        );
        requests.push(request);
      }

      // Execute batch
      await forwarder.connect(relayer).executeBatch(requests, ethers.ZeroAddress);

      // Verify all executed
      const finalPoints = await exampleTarget.getPoints(user.address);
      expect(finalPoints).to.equal(30n);

      const finalNonce = await forwarder.nonces(user.address);
      expect(finalNonce).to.equal(currentNonce + 3n);
    });

    it("Should handle batch with refund receiver (non-atomic)", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const currentNonce = await forwarder.nonces(user.address);

      // Create valid and invalid requests
      const data1 = exampleTarget.interface.encodeFunctionData("addPoints", [10n]);
      const request1 = await createSignedRequest(
        forwarder,
        user.address,
        await exampleTarget.getAddress(),
        0n,
        100000n,
        deadline,
        data1,
        user,
        currentNonce,
      );

      // Invalid request (wrong nonce)
      const data2 = exampleTarget.interface.encodeFunctionData("addPoints", [20n]);
      const request2 = await createSignedRequest(
        forwarder,
        user.address,
        await exampleTarget.getAddress(),
        0n,
        100000n,
        deadline,
        data2,
        user,
        currentNonce + 5n, // Skip nonces - will fail
      );

      const data3 = exampleTarget.interface.encodeFunctionData("addPoints", [30n]);
      const request3 = await createSignedRequest(
        forwarder,
        user.address,
        await exampleTarget.getAddress(),
        0n,
        100000n,
        deadline,
        data3,
        user,
        currentNonce + 1n,
      );

      // Execute batch with refund receiver (non-atomic)
      await forwarder.connect(relayer).executeBatch([request1, request2, request3], relayer.address);

      // Only valid requests should execute (request1 and request3)
      const finalPoints = await exampleTarget.getPoints(user.address);
      expect(finalPoints).to.equal(40n); // 10 + 30

      const finalNonce = await forwarder.nonces(user.address);
      expect(finalNonce).to.equal(currentNonce + 2n);
    });

    it("Should measure gas savings for batch execution", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const currentNonce = await forwarder.nonces(user.address);

      // Create 3 requests
      const requests = [];
      for (let i = 0; i < 3; i++) {
        const data = exampleTarget.interface.encodeFunctionData("addPoints", [5n]);
        const request = await createSignedRequest(
          forwarder,
          user.address,
          await exampleTarget.getAddress(),
          0n,
          100000n,
          deadline,
          data,
          user,
          currentNonce + BigInt(i),
        );
        requests.push(request);
      }

      // Execute batch and measure gas
      const tx = await forwarder.connect(relayer).executeBatch(requests, ethers.ZeroAddress);
      const receipt = await tx.wait();
      const batchGas = receipt?.gasUsed || 0n;

      // Gas figures are surfaced via hardhat-gas-reporter; no console output here.
      void batchGas;

      // Verify execution
      const finalPoints = await exampleTarget.getPoints(user.address);
      expect(finalPoints).to.equal(15n);
    });
  });

  describe("Multi-User Scenarios", function () {
    it("Should handle transactions from multiple users", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // User 1 transaction
      const data1 = exampleTarget.interface.encodeFunctionData("addPoints", [10n]);
      const request1 = await createSignedRequest(
        forwarder,
        user.address,
        await exampleTarget.getAddress(),
        0n,
        100000n,
        deadline,
        data1,
        user,
      );

      // User 2 transaction
      const data2 = exampleTarget.interface.encodeFunctionData("addPoints", [20n]);
      const request2 = await createSignedRequest(
        forwarder,
        user2.address,
        await exampleTarget.getAddress(),
        0n,
        100000n,
        deadline,
        data2,
        user2,
      );

      // Execute both
      await forwarder.connect(relayer).execute(request1);
      await forwarder.connect(relayer).execute(request2);

      // Verify separate balances
      const user1Points = await exampleTarget.getPoints(user.address);
      expect(user1Points).to.equal(10n);

      const user2Points = await exampleTarget.getPoints(user2.address);
      expect(user2Points).to.equal(20n);

      // Verify separate nonces
      const user1Nonce = await forwarder.nonces(user.address);
      expect(user1Nonce).to.equal(1n);

      const user2Nonce = await forwarder.nonces(user2.address);
      expect(user2Nonce).to.equal(1n);
    });

    it("Should handle mixed batch from multiple users", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const requests = [];

      // User 1 - 2 transactions
      for (let i = 0; i < 2; i++) {
        const data = exampleTarget.interface.encodeFunctionData("addPoints", [5n]);
        const request = await createSignedRequest(
          forwarder,
          user.address,
          await exampleTarget.getAddress(),
          0n,
          100000n,
          deadline,
          data,
          user,
          BigInt(i),
        );
        requests.push(request);
      }

      // User 2 - 2 transactions
      for (let i = 0; i < 2; i++) {
        const data = exampleTarget.interface.encodeFunctionData("addPoints", [10n]);
        const request = await createSignedRequest(
          forwarder,
          user2.address,
          await exampleTarget.getAddress(),
          0n,
          100000n,
          deadline,
          data,
          user2,
          BigInt(i),
        );
        requests.push(request);
      }

      // Execute mixed batch
      await forwarder.connect(relayer).executeBatch(requests, ethers.ZeroAddress);

      // Verify results
      const user1Points = await exampleTarget.getPoints(user.address);
      expect(user1Points).to.equal(10n); // 2 * 5

      const user2Points = await exampleTarget.getPoints(user2.address);
      expect(user2Points).to.equal(20n); // 2 * 10
    });
  });

  describe("Error Scenarios", function () {
    it("Should handle expired deadline gracefully", async function () {
      const expiredDeadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const data = exampleTarget.interface.encodeFunctionData("addPoints", [10n]);

      const request = await createSignedRequest(
        forwarder,
        user.address,
        await exampleTarget.getAddress(),
        0n,
        100000n,
        expiredDeadline,
        data,
        user,
      );

      await expect(forwarder.connect(relayer).execute(request)).to.be.revertedWithCustomError(
        forwarder,
        "ERC2771ForwarderExpiredRequest",
      );

      // Verify no state change
      const points = await exampleTarget.getPoints(user.address);
      expect(points).to.equal(0n);

      const nonce = await forwarder.nonces(user.address);
      expect(nonce).to.equal(0n);
    });

    it("Should handle signature from wrong signer", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const data = exampleTarget.interface.encodeFunctionData("addPoints", [10n]);

      // User2 signs for user1's transaction
      const request = await createSignedRequest(
        forwarder,
        user.address, // From user1
        await exampleTarget.getAddress(),
        0n,
        100000n,
        deadline,
        data,
        user2, // But signed by user2
      );

      await expect(forwarder.connect(relayer).execute(request)).to.be.revertedWithCustomError(
        forwarder,
        "ERC2771ForwarderInvalidSigner",
      );
    });

    it("Should handle out-of-order nonces in batch", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const currentNonce = await forwarder.nonces(user.address);

      // Create requests with wrong order
      const data1 = exampleTarget.interface.encodeFunctionData("addPoints", [10n]);
      const request1 = await createSignedRequest(
        forwarder,
        user.address,
        await exampleTarget.getAddress(),
        0n,
        100000n,
        deadline,
        data1,
        user,
        currentNonce + 1n, // Wrong: should be currentNonce
      );

      const data2 = exampleTarget.interface.encodeFunctionData("addPoints", [20n]);
      const request2 = await createSignedRequest(
        forwarder,
        user.address,
        await exampleTarget.getAddress(),
        0n,
        100000n,
        deadline,
        data2,
        user,
        currentNonce,
      );

      // Atomic batch should fail
      await expect(
        forwarder.connect(relayer).executeBatch([request1, request2], ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(forwarder, "ERC2771ForwarderInvalidSigner");
    });
  });

  describe("Gas Optimization", function () {
    it("Should demonstrate batch vs individual execution savings", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const txCount = 3;

      // Individual execution
      let totalIndividualGas = 0n;
      for (let i = 0; i < txCount; i++) {
        const data = exampleTarget.interface.encodeFunctionData("addPoints", [5n]);
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

        const tx = await forwarder.connect(relayer).execute(request);
        const receipt = await tx.wait();
        totalIndividualGas += receipt?.gasUsed || 0n;
      }

      // Reset for batch test
      const user3 = (await ethers.getSigners())[4];
      const currentNonce = await forwarder.nonces(user3.address);

      // Batch execution
      const requests = [];
      for (let i = 0; i < txCount; i++) {
        const data = exampleTarget.interface.encodeFunctionData("addPoints", [5n]);
        const request = await createSignedRequest(
          forwarder,
          user3.address,
          await exampleTarget.getAddress(),
          0n,
          100000n,
          deadline,
          data,
          user3,
          currentNonce + BigInt(i),
        );
        requests.push(request);
      }

      const batchTx = await forwarder.connect(relayer).executeBatch(requests, ethers.ZeroAddress);
      const batchReceipt = await batchTx.wait();
      const batchGas = batchReceipt?.gasUsed || 0n;

      // Gas figures and savings are produced by hardhat-gas-reporter
      // when REPORT_GAS=true; no console output here.
      expect(batchGas).to.be.lessThan(totalIndividualGas);
    });
  });
});

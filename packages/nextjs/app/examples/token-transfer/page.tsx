"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const TokenInfoCard = () => {
  const { address: connectedAddress } = useAccount();

  const { data: balance } = useScaffoldReadContract({
    contractName: "ExampleToken",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

  const { data: tokenSymbol } = useScaffoldReadContract({
    contractName: "ExampleToken",
    functionName: "symbol",
  });

  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "ExampleToken",
    functionName: "totalSupply",
  });

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Token Information</h2>
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-base-200 p-4 rounded-box flex justify-between items-center">
            <span className="text-sm opacity-70">Total Supply</span>
            <span className="text-xl font-bold">
              {totalSupply ? formatUnits(totalSupply, 18) : "0"} {tokenSymbol}
            </span>
          </div>
          <div className="bg-base-200 p-4 rounded-box flex justify-between items-center">
            <span className="text-sm opacity-70">Your Balance</span>
            <span className="text-xl font-bold">
              {balance ? formatUnits(balance, 18) : "0"} {tokenSymbol}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const TransferCard = () => {
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");

  const { data: tokenSymbol } = useScaffoldReadContract({
    contractName: "ExampleToken",
    functionName: "symbol",
  });

  const { writeContractAsync: writeExampleTokenAsync } = useScaffoldWriteContract("ExampleToken");

  const handleTransfer = async () => {
    if (!recipientAddress || !amount) {
      alert("Please enter recipient address and amount");
      return;
    }

    try {
      const amountInWei = parseUnits(amount, 18);
      await writeExampleTokenAsync({
        functionName: "transfer",
        args: [recipientAddress, amountInWei],
      });
      setAmount("");
      setRecipientAddress("");
    } catch (error) {
      console.error("Transfer failed:", error);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Transfer Tokens</h2>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Recipient Address</span>
          </label>
          <AddressInput value={recipientAddress} onChange={setRecipientAddress} placeholder="0x..." />
        </div>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Amount to Transfer</span>
          </label>
          <div className="join">
            <input
              type="number"
              placeholder="0.0"
              className="input input-bordered w-full join-item"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <div className="join-item btn btn-disabled">{tokenSymbol}</div>
          </div>
        </div>

        <div className="card-actions justify-end mt-4">
          <button className="btn btn-primary" onClick={handleTransfer}>
            Send Tokens
          </button>
        </div>
      </div>
    </div>
  );
};

const RecentTransfersCard = () => {
  const { data: transferEvents, isLoading: isLoadingEvents } = useScaffoldEventHistory({
    contractName: "ExampleToken",
    eventName: "Transfer",
    fromBlock: 0n,
    watch: true,
  });

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title mb-4">Recent Transfers</h2>
        <div className="overflow-x-auto">
          {isLoadingEvents ? (
            <div className="text-center py-4">Loading events...</div>
          ) : !transferEvents || transferEvents.length === 0 ? (
            <div className="text-center py-4 opacity-50">No transfers yet</div>
          ) : (
            <table className="table table-zebra w-full text-sm">
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {[...transferEvents]
                  .reverse()
                  .slice(0, 10)
                  .map((event, index) => (
                    <tr key={index}>
                      <td>
                        <Address address={event.args.from} size="xs" />
                      </td>
                      <td>
                        <Address address={event.args.to} size="xs" />
                      </td>
                      <td>{event.args.value ? formatUnits(event.args.value, 18) : "0"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const TokenTransfer: NextPage = () => {
  const { data: tokenName } = useScaffoldReadContract({
    contractName: "ExampleToken",
    functionName: "name",
  });

  const { data: tokenSymbol } = useScaffoldReadContract({
    contractName: "ExampleToken",
    functionName: "symbol",
  });

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 w-full max-w-4xl">
        <h1 className="text-center mb-8">
          <span className="block text-4xl font-bold">Token Transfer dApp</span>
          <span className="block text-2xl mt-2">
            {tokenName} ({tokenSymbol})
          </span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6">
            <TokenInfoCard />
            <TransferCard />
          </div>

          <div className="flex flex-col gap-6">
            <RecentTransfersCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenTransfer;
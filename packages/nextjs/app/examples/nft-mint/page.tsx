"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const NFTInfoCard = () => {
  const { address: connectedAddress } = useAccount();

  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "SimpleNFT",
    functionName: "totalSupply",
  });

  const { data: nextId } = useScaffoldReadContract({
    contractName: "SimpleNFT",
    functionName: "nextId",
  });

  const { data: balanceOf } = useScaffoldReadContract({
    contractName: "SimpleNFT",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Collection Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-base-200 p-4 rounded-box">
            <p className="text-sm opacity-70">Total Minted</p>
            <p className="text-3xl font-bold">{totalSupply?.toString() || "0"}</p>
          </div>
          <div className="bg-base-200 p-4 rounded-box">
            <p className="text-sm opacity-70">Next Token ID</p>
            <p className="text-3xl font-bold">#{nextId?.toString() || "0"}</p>
          </div>
          <div className="bg-base-200 p-4 rounded-box col-span-2">
            <p className="text-sm opacity-70">Your Balance</p>
            <p className="text-3xl font-bold">{balanceOf?.toString() || "0"} NFTs</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MintCard = () => {
  const { address: connectedAddress } = useAccount();
  const [mintToAddress, setMintToAddress] = useState("");

  const { writeContractAsync: writeSimpleNFTAsync } = useScaffoldWriteContract("SimpleNFT");

  const handleMint = async () => {
    const targetAddress = mintToAddress || connectedAddress;
    if (!targetAddress) {
      alert("Please connect wallet or enter an address");
      return;
    }

    try {
      await writeSimpleNFTAsync({
        functionName: "mint",
        args: [targetAddress],
      });
      setMintToAddress("");
    } catch (error) {
      console.error("Minting failed:", error);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Mint NFT</h2>

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Mint To Address (leave empty to mint to yourself)</span>
          </label>
          <AddressInput value={mintToAddress} onChange={setMintToAddress} placeholder="0x..." />
        </div>

        <div className="card-actions justify-end mt-4">
          <button className="btn btn-primary" onClick={handleMint}>
            Mint NFT
          </button>
        </div>
      </div>
    </div>
  );
};

const RecentMintsCard = () => {
  const { data: mintEvents, isLoading: isLoadingEvents } = useScaffoldEventHistory({
    contractName: "SimpleNFT",
    eventName: "NFTMinted",
    fromBlock: 0n,
    watch: true,
  });

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title mb-4">Recent Mints</h2>
        <div className="overflow-x-auto">
          {isLoadingEvents ? (
            <div className="text-center py-4">Loading events...</div>
          ) : !mintEvents || mintEvents.length === 0 ? (
            <div className="text-center py-4 opacity-50">No mints yet</div>
          ) : (
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Token ID</th>
                  <th>To</th>
                </tr>
              </thead>
              <tbody>
                {[...mintEvents]
                  .reverse()
                  .slice(0, 10)
                  .map((event, index) => (
                    <tr key={index}>
                      <td className="font-bold">#{event.args.tokenId?.toString()}</td>
                      <td>
                        <Address address={event.args.to} size="sm" />
                      </td>
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

const NFTMint: NextPage = () => {
  const { data: nftName } = useScaffoldReadContract({
    contractName: "SimpleNFT",
    functionName: "name",
  });

  const { data: nftSymbol } = useScaffoldReadContract({
    contractName: "SimpleNFT",
    functionName: "symbol",
  });

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 w-full max-w-4xl">
        <h1 className="text-center mb-8">
          <span className="block text-4xl font-bold">NFT Minting dApp</span>
          <span className="block text-2xl mt-2">
            {nftName} ({nftSymbol})
          </span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6">
            <NFTInfoCard />
            <MintCard />
          </div>

          <div className="flex flex-col gap-6">
            <RecentMintsCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTMint;
"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { AddressInput } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const ProposalCard = ({ proposalId }: { proposalId: bigint }) => {
  const { data: proposal } = useScaffoldReadContract({
    contractName: "SimpleDAO",
    functionName: "getProposal",
    args: [proposalId],
  });

  const { writeContractAsync: writeSimpleDAOAsync } = useScaffoldWriteContract("SimpleDAO");

  const handleVote = async (support: boolean) => {
    try {
      await writeSimpleDAOAsync({
        functionName: "vote",
        args: [proposalId, support],
      });
    } catch (error) {
      console.error("Voting failed:", error);
    }
  };

  const handleExecute = async () => {
    try {
      await writeSimpleDAOAsync({
        functionName: "execute",
        args: [proposalId],
      });
    } catch (error) {
      console.error("Execution failed:", error);
    }
  };

  if (!proposal)
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="h-4 bg-slate-200 rounded w-full"></div>
      </div>
    );

  const [description, votesFor, votesAgainst, executed] = proposal;

  return (
    <div className="card bg-base-100 shadow-xl mb-4 border border-base-300">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <h3 className="card-title">Proposal #{proposalId.toString()}</h3>
          {executed ? (
            <div className="badge badge-success">Executed</div>
          ) : (
            <div className="badge badge-warning">Active</div>
          )}
        </div>

        <p className="text-lg my-2">{description}</p>

        <div className="grid grid-cols-2 gap-4 my-2">
          <div className="bg-base-200 p-3 rounded-box text-center">
            <div className="text-success font-bold text-xl">{votesFor.toString()}</div>
            <div className="text-sm opacity-70">Votes For</div>
          </div>
          <div className="bg-base-200 p-3 rounded-box text-center">
            <div className="text-error font-bold text-xl">{votesAgainst.toString()}</div>
            <div className="text-sm opacity-70">Votes Against</div>
          </div>
        </div>

        <div className="card-actions justify-end mt-4">
          {!executed && (
            <>
              <button className="btn btn-success btn-sm" onClick={() => handleVote(true)}>
                Vote For
              </button>
              <button className="btn btn-error btn-sm" onClick={() => handleVote(false)}>
                Vote Against
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleExecute}>
                Execute
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const DAOVote: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [userAddress, setUserAddress] = useState("");
  const [votingPower, setVotingPower] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");

  // Read DAO info
  const { data: owner } = useScaffoldReadContract({
    contractName: "SimpleDAO",
    functionName: "owner",
  });

  const { data: proposalCount } = useScaffoldReadContract({
    contractName: "SimpleDAO",
    functionName: "proposalCount",
  });

  const { data: myVotingPower } = useScaffoldReadContract({
    contractName: "SimpleDAO",
    functionName: "votingPower",
    args: [connectedAddress],
  });

  // Write contract
  const { writeContractAsync: writeSimpleDAOAsync } = useScaffoldWriteContract("SimpleDAO");

  const isOwner = connectedAddress && owner && connectedAddress.toLowerCase() === owner.toLowerCase();

  const handleSetVotingPower = async () => {
    if (!userAddress || !votingPower) {
      alert("Please enter address and voting power");
      return;
    }

    try {
      await writeSimpleDAOAsync({
        functionName: "setVotingPower",
        args: [userAddress, BigInt(votingPower)],
      });
      setUserAddress("");
      setVotingPower("");
    } catch (error) {
      console.error("Setting voting power failed:", error);
    }
  };

  const handleCreateProposal = async () => {
    if (!proposalDescription) {
      alert("Please enter proposal description");
      return;
    }

    try {
      await writeSimpleDAOAsync({
        functionName: "propose",
        args: [proposalDescription],
      });
      setProposalDescription("");
    } catch (error) {
      console.error("Creating proposal failed:", error);
    }
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 w-full max-w-4xl">
        <h1 className="text-center mb-8">
          <span className="block text-4xl font-bold">DAO Governance</span>
          <span className="block text-xl mt-2">Vote on proposals and manage the organization</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6">
            {/* User Info */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Your Status</h2>
                <div className="flex items-center justify-between">
                  <span>Voting Power:</span>
                  <span className="text-2xl font-bold">{myVotingPower?.toString() || "0"}</span>
                </div>
                {isOwner && <div className="badge badge-primary mt-2">Owner</div>}
              </div>
            </div>

            {/* Create Proposal */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Create Proposal</h2>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Description</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered h-24"
                    placeholder="Proposal description..."
                    value={proposalDescription}
                    onChange={e => setProposalDescription(e.target.value)}
                  ></textarea>
                </div>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-primary" onClick={handleCreateProposal}>
                    Propose
                  </button>
                </div>
              </div>
            </div>

            {/* Admin Panel */}
            {isOwner && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title">Admin: Set Voting Power</h2>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">User Address</span>
                    </label>
                    <AddressInput value={userAddress} onChange={setUserAddress} placeholder="0x..." />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Voting Power Amount</span>
                    </label>
                    <input
                      type="number"
                      placeholder="100"
                      className="input input-bordered"
                      value={votingPower}
                      onChange={e => setVotingPower(e.target.value)}
                    />
                  </div>
                  <div className="card-actions justify-end mt-4">
                    <button className="btn btn-secondary" onClick={handleSetVotingPower}>
                      Set Power
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {/* Proposals List */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Proposals ({proposalCount?.toString() || "0"})</h2>
              {proposalCount && Number(proposalCount) > 0 ? (
                // Reverse the array to show newest first
                [...Array(Number(proposalCount))].map((_, index) => (
                  <ProposalCard key={index} proposalId={BigInt(Number(proposalCount) - 1 - index)} />
                ))
              ) : (
                <div className="text-center opacity-50">No proposals yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DAOVote;
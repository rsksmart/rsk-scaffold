"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function DaoVotingExample() {
	const { address } = useAccount();
	const [newDesc, setNewDesc] = useState("Should we adopt DemoToken as community token?");
	const [selectedId, setSelectedId] = useState<number>(0);

	const { data: proposalsCount } = useScaffoldReadContract({
		contractName: "SimpleDao",
		functionName: "proposalsCount",
		args: [],
	});

	const { data: proposal } = useScaffoldReadContract({
		contractName: "SimpleDao",
		functionName: "getProposal",
		args: [BigInt(selectedId || 0)],
		query: { enabled: selectedId >= 0 },
	});

	const { writeContractAsync: writeDao } = useScaffoldWriteContract("SimpleDao");

	const deadlineText = useMemo(() => {
		if (!proposal) return "-";
		const [, deadline] = proposal as any;
		const ms = Number(deadline) * 1000;
		if (ms <= Date.now()) return "Ended";
		const secondsLeft = Math.floor((ms - Date.now()) / 1000);
		const minutes = Math.floor(secondsLeft / 60);
		const seconds = secondsLeft % 60;
		return `${minutes}m ${seconds}s left`;
	}, [proposal]);

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-semibold">DAO Voting (Simple Yes/No)</h1>
				<p className="text-neutral-600 dark:text-neutral-300">
					Create proposals and vote with 1-person-1-vote. The chairperson (deployer) can execute results.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="border rounded-xl p-4 space-y-3">
					<h2 className="font-semibold">Create Proposal</h2>
					<input
						className="input input-bordered w-full"
						value={newDesc}
						onChange={e => setNewDesc(e.target.value)}
					/>
					<button
						className="btn btn-primary"
						onClick={async () => {
							await writeDao({
								functionName: "createProposal",
								args: [newDesc, BigInt(120)], // 2 minutes demo period
							});
						}}
					>
						Create (chair only)
					</button>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						Total proposals: {proposalsCount?.toString() ?? 0}
					</p>
				</div>
				<div className="border rounded-xl p-4 space-y-3">
					<h2 className="font-semibold">Vote</h2>
					<input
						type="number"
						min={0}
						className="input input-bordered w-full"
						placeholder="Proposal ID"
						value={selectedId}
						onChange={e => setSelectedId(parseInt(e.target.value || "0"))}
					/>
					{proposal && (
						<div className="text-sm space-y-1">
							<p>
								<b>Description:</b> {(proposal as any)[0]}
							</p>
							<p>
								<b>Deadline:</b> {deadlineText}
							</p>
							<p>
								<b>Yes</b>: {(proposal as any)[2].toString()} &nbsp; <b>No</b>:{" "}
								{(proposal as any)[3].toString()}
							</p>
							<p>
								<b>Executed</b>: {(proposal as any)[4] ? "Yes" : "No"}
							</p>
						</div>
					)}
					<div className="flex gap-2">
						<button
							className="btn btn-secondary"
							onClick={async () => {
								await writeDao({
									functionName: "vote",
									args: [BigInt(selectedId), true],
								});
							}}
						>
							Vote Yes
						</button>
						<button
							className="btn"
							onClick={async () => {
								await writeDao({
									functionName: "vote",
									args: [BigInt(selectedId), false],
								});
							}}
						>
							Vote No
						</button>
						<button
							className="btn btn-outline"
							onClick={async () => {
								await writeDao({
									functionName: "execute",
									args: [BigInt(selectedId)],
								});
							}}
						>
							Execute (chair only)
						</button>
					</div>
				</div>
			</div>

			<div className="border rounded-xl p-4">
				<h3 className="font-semibold mb-2">Tutorial</h3>
				<ol className="list-decimal list-inside space-y-1 text-sm leading-6">
					<li>The deployer account is the chair and can create/execute proposals.</li>
					<li>Create a proposal with a short voting window (2 minutes in this demo).</li>
					<li>Anyone can vote once per proposal. Votes are 1-person-1-vote.</li>
					<li>After the deadline, the chair can execute. Passed if yesVotes &gt; noVotes.</li>
					<li>Extend this by plugging in an ERC20 token address in the DAO constructor for weighted voting.</li>
				</ol>
			</div>
		</div>
	);
}


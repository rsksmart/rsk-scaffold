/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function TokenTransferExample() {
	const { address } = useAccount();
	const [recipient, setRecipient] = useState<string>("");
	const [amount, setAmount] = useState<string>("100");

	const { data: myBalance } = useScaffoldReadContract({
		contractName: "TokenDemo",
		functionName: "balanceOf",
		args: [address as `0x${string}`],
	});

	const { writeContractAsync: writeToken } = useScaffoldWriteContract("TokenDemo");

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-semibold">Token Transfer (ERC20)</h1>
				<p className="text-neutral-600 dark:text-neutral-300">
					Mint some demo tokens and transfer them to any address.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="border rounded-xl p-4 space-y-4">
					<h2 className="font-semibold">Your Balance</h2>
					<p className="text-lg">
						{myBalance ? `${formatEther(myBalance as bigint)} DEMO` : "Connect wallet and deploy contracts"}
					</p>
					<button
						className="btn btn-primary"
						onClick={async () => {
							if (!address) return;
							await writeToken({
								functionName: "mint",
								args: [address as `0x${string}`, parseEther("1000")],
							});
						}}
					>
						Mint 1000 DEMO to me
					</button>
				</div>
				<div className="border rounded-xl p-4 space-y-3">
					<h2 className="font-semibold">Transfer</h2>
					<input
						className="input input-bordered w-full"
						placeholder="Recipient address (0x...)"
						value={recipient}
						onChange={e => setRecipient(e.target.value)}
					/>
					<input
						className="input input-bordered w-full"
						placeholder="Amount (DEMO)"
						value={amount}
						onChange={e => setAmount(e.target.value)}
					/>
					<button
						className="btn btn-secondary"
						onClick={async () => {
							if (!recipient || !amount) return;
							await writeToken({
								functionName: "transfer",
								args: [recipient as `0x${string}`, parseEther(amount)],
							});
						}}
					>
						Send
					</button>
				</div>
			</div>

			<div className="border rounded-xl p-4">
				<h3 className="font-semibold mb-2">Tutorial</h3>
				<ol className="list-decimal list-inside space-y-1 text-sm leading-6">
					<li>Connect your wallet to the Rootstock testnet configured in this scaffold.</li>
					<li>Click “Mint 1000 DEMO to me” to mint ERC20 tokens to your address.</li>
					<li>Enter a recipient and amount, then click “Send” to transfer.</li>
					<li>Open the Debug/Contracts page to explore functions and events.</li>
					<li>Check the Block Explorer section to verify transfers.</li>
				</ol>
			</div>
		</div>
	);
}


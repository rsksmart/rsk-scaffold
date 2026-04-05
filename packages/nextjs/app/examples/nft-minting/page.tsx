"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export default function NftMintingExample() {
	const { address } = useAccount();
	const [lastTokenId, setLastTokenId] = useState<number | null>(null);

	const { data: balance } = useScaffoldReadContract({
		contractName: "NftDemo",
		functionName: "balanceOf",
		args: [address as `0x${string}`],
	});

	const { writeContractAsync: writeNft } = useScaffoldWriteContract("NftDemo");

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-semibold">NFT Minting (ERC721)</h1>
				<p className="text-neutral-600 dark:text-neutral-300">Mint a Demo NFT to your wallet.</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="border rounded-xl p-4 space-y-3">
					<h2 className="font-semibold">Your NFT Balance</h2>
					<p className="text-lg">{balance?.toString() ?? "-"}</p>
					<button
						className="btn btn-primary"
						onClick={async () => {
							const tokenId = await writeNft({
								functionName: "safeMint",
								args: [address as `0x${string}`],
							});
							try {
								// tokenId may be undefined depending on write wrapper; retain simple UX
								if (typeof tokenId === "bigint") {
									setLastTokenId(Number(tokenId));
								}
							} catch {
								// ignore
							}
						}}
					>
						Mint NFT
					</button>
					{lastTokenId !== null && <p className="text-sm">Last minted tokenId: {lastTokenId}</p>}
				</div>
				<div className="border rounded-xl p-4 space-y-3">
					<h2 className="font-semibold">Metadata</h2>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						The contract uses a baseTokenUri (default: ipfs://demo-metadata/) and sequential token IDs. Update it
						with setBaseTokenUri if you host your own metadata.
					</p>
				</div>
			</div>

			<div className="border rounded-xl p-4">
				<h3 className="font-semibold mb-2">Tutorial</h3>
				<ol className="list-decimal list-inside space-y-1 text-sm leading-6">
					<li>Connect your wallet to the configured Rootstock network.</li>
					<li>Click “Mint NFT” to mint a new token to your address.</li>
					<li>Check your balance and view the tokenId in the UI.</li>
					<li>Optionally call setBaseTokenUri to point to your metadata server or IPFS.</li>
					<li>Inspect events and reads in the Debug/Contracts page.</li>
				</ol>
			</div>
		</div>
	);
}


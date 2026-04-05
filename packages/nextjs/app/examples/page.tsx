import Link from "next/link";

export default function ExamplesIndexPage() {
	return (
		<div className="space-y-6">
			<h1 className="text-3xl font-bold">Rootstock Scaffold Examples</h1>
			<p className="text-neutral-600 dark:text-neutral-300">
				A set of mini dApps demonstrating core Rootstock functionalities. Each example includes a short,
				step-by-step tutorial.
			</p>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Link
					href="/examples/token-transfer"
					className="border rounded-xl p-4 hover:border-primary/60 transition-colors"
				>
					<h2 className="font-semibold">Token Transfer</h2>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						Mint demo ERC20 and transfer to another address.
					</p>
				</Link>
				<Link href="/examples/nft-minting" className="border rounded-xl p-4 hover:border-primary/60 transition-colors">
					<h2 className="font-semibold">NFT Minting</h2>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">Mint an ERC721 to your wallet.</p>
				</Link>
				<Link href="/examples/dao-voting" className="border rounded-xl p-4 hover:border-primary/60 transition-colors">
					<h2 className="font-semibold">DAO Voting</h2>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">Create a proposal and cast votes.</p>
				</Link>
			</div>
		</div>
	);
}


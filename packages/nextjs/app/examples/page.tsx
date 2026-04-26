"use client";

import Link from "next/link";
import type { NextPage } from "next";

const Examples: NextPage = () => {
  const examples = [
    {
      title: "Token Transfer",
      description: "Learn how to create and transfer ERC-20 tokens",
      features: [
        "Fixed-supply ERC-20 token",
        "Transfer tokens between addresses",
        "Check token balances",
        "Human-friendly amount input",
      ],
      link: "/examples/token-transfer",
      icon: "💰",
      color: "bg-primary",
    },
    {
      title: "NFT Minting",
      description: "Mint and manage ERC-721 NFTs",
      features: [
        "Simple ERC-721 implementation",
        "Mint NFTs to any address",
        "Auto-incrementing token IDs",
        "View NFT balances",
      ],
      link: "/examples/nft-mint",
      icon: "🖼️",
      color: "bg-secondary",
    },
    {
      title: "DAO Voting",
      description: "Experience decentralized governance",
      features: [
        "Create and vote on proposals",
        "Weighted voting system",
        "Execute passed proposals",
        "Owner-managed voting power",
      ],
      link: "/examples/dao-vote",
      icon: "🗳️",
      color: "bg-accent",
    },
  ];

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 w-full max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Mini dApp Examples</h1>
          <p className="text-xl opacity-70">Educational examples demonstrating common dApp patterns on Rootstock</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {examples.map((example, index) => (
            <div key={index} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body">
                <div
                  className={`w-16 h-16 rounded-full ${example.color} flex items-center justify-center text-3xl mb-4`}
                >
                  {example.icon}
                </div>
                <h2 className="card-title text-2xl">{example.title}</h2>
                <p className="opacity-70 mb-4">{example.description}</p>

                <div className="mb-4">
                  <p className="font-semibold mb-2">Features:</p>
                  <ul className="space-y-1">
                    {example.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-success mr-2">✓</span>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="card-actions justify-end mt-auto">
                  <Link href={example.link} className="btn btn-primary">
                    Try it out →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Getting Started Section */}
        <div className="card bg-base-200 shadow-xl mb-12">
          <div className="card-body">
            <h2 className="card-title text-3xl mb-4">Getting Started</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-xl mb-2">1. Deploy the Contracts</h3>
                <div className="mockup-code">
                  <pre data-prefix="$">
                    <code>yarn chain</code>
                  </pre>
                  <pre data-prefix="$">
                    <code>yarn deploy --tags examples</code>
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-xl mb-2">2. Start the Frontend</h3>
                <div className="mockup-code">
                  <pre data-prefix="$">
                    <code>yarn start</code>
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-xl mb-2">3. Connect Your Wallet</h3>
                <p className="opacity-70">
                  Click the &quot;Connect Wallet&quot; button in the header and select your wallet provider.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-xl mb-2">4. Explore the Examples</h3>
                <p className="opacity-70">
                  Navigate to any of the example dApps above and start interacting with the smart contracts!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Resources */}
        <div className="card bg-base-100 shadow-xl mb-12">
          <div className="card-body">
            <h2 className="card-title text-3xl mb-4">Learning Resources</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-lg mb-2">📚 Documentation</h3>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="https://dev.rootstock.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary"
                    >
                      Rootstock Developer Portal
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://docs.scaffoldeth.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary"
                    >
                      Scaffold-ETH Documentation
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://docs.openzeppelin.com/contracts"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary"
                    >
                      OpenZeppelin Contracts
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2">🛠️ Tools & Frameworks</h3>
                <ul className="space-y-2">
                  <li>
                    <span className="font-semibold">Hardhat:</span> Smart contract development
                  </li>
                  <li>
                    <span className="font-semibold">Next.js:</span> React framework for the frontend
                  </li>
                  <li>
                    <span className="font-semibold">Wagmi:</span> React hooks for Ethereum
                  </li>
                  <li>
                    <span className="font-semibold">RainbowKit:</span> Wallet connection UI
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Addresses */}
        <div className="alert alert-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <div>
            <h3 className="font-bold">Contract Information</h3>
            <div className="text-xs">
              After deployment, contract addresses and ABIs are automatically loaded from the deployments folder. Check
              the Debug Contracts page to view deployed contract details.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Examples;
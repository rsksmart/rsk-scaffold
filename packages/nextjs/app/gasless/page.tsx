"use client";

import { useAccount } from "wagmi";
import Badge from "~~/components/ui/Badge";
import { EXAMPLE_TARGET_ADDRESS, FORWARDER_ADDRESS } from "~~/utils/gasless/config";
import { ContractInfoCard } from "./_components/ContractInfoCard";
import { HowItWorksPanel } from "./_components/HowItWorksPanel";
import { MissingConfigBanner } from "./_components/MissingConfigBanner";
import { NetworkMismatchBanner, useExpectedChain } from "./_components/NetworkMismatchBanner";
import { PointsCard } from "./_components/PointsCard";
import { TransactionLog } from "./_components/TransactionLog";
import { TransactionMethodsPanel } from "./_components/TransactionMethodsPanel";
import { useGaslessDemo } from "./_hooks/useGaslessDemo";

export default function GaslessPage() {
  const { isConnected } = useAccount();
  const demo = useGaslessDemo();
  const { mismatch: chainMismatch, expectedChainId } = useExpectedChain();

  // Compute a single human-readable reason to lock the action panel,
  // surfaced inline by TransactionMethodsPanel. Banners above the panel
  // explain the underlying cause and offer remediation.
  const configMissing = !FORWARDER_ADDRESS || !EXAMPLE_TARGET_ADDRESS;
  const disabledReason = configMissing
    ? "missing required NEXT_PUBLIC_* environment variables (see banner above)"
    : chainMismatch
      ? `connected wallet is on the wrong chain (expected chain id ${expectedChainId})`
      : undefined;

  if (!isConnected) {
    return (
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">Gasless Transactions</span>
          </h1>
          <p className="text-center text-lg">Please connect your wallet to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-6 lg:gap-y-8 py-8 lg:py-12 justify-center items-center">
      <div className="w-full max-w-7xl px-6 lg:px-10">
        <div className="flex gap-1">
          <Badge type="number">2</Badge>
          <Badge>Gasless Demo</Badge>
        </div>
        <h2 className="text-4xl font-bold mt-2">Gasless Transactions Demo</h2>
        <span className="flex gap-1 items-center my-0 font-light">
          Experience meta-transactions on Rootstock Testnet
        </span>

        <div className="w-full flex flex-col lg:flex-row gap-7 mt-12">
          <div className="flex flex-col gap-7 w-full lg:w-auto">
            <PointsCard points={demo.points} loading={demo.loadingPoints} onRefresh={demo.loadPoints} />
            <ContractInfoCard />
          </div>

          <div className="w-full flex flex-col gap-7">
            <MissingConfigBanner />
            <NetworkMismatchBanner />
            <TransactionMethodsPanel
              isRunning={demo.isRunning}
              onDirect={demo.handleDirectCall}
              onGasless={demo.handleGaslessCall}
              onBatch={demo.handleBatchCall}
              disabledReason={disabledReason}
            />
            <TransactionLog logs={demo.logs} txHash={demo.txHash} onClear={demo.clearLogs} />
            <HowItWorksPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

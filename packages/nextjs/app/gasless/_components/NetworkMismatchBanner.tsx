"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { CHAIN_ID } from "~~/utils/gasless/config";

/**
 * Hook returning whether the connected wallet is on the chain the demo
 * expects (NEXT_PUBLIC_CHAIN_ID, default 31 / Rootstock testnet) and a
 * convenience `switchToExpectedChain` action. The page uses this to
 * disable the action panel and to render <NetworkMismatchBanner />.
 */
export function useExpectedChain() {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const expectedChainId = CHAIN_ID;
  const mismatch = isConnected && chainId !== undefined && chainId !== expectedChainId;
  return {
    expectedChainId,
    currentChainId: chainId,
    mismatch,
    switching: isPending,
    switchToExpectedChain: () => switchChain({ chainId: expectedChainId }),
  };
}

export function NetworkMismatchBanner() {
  const { mismatch, expectedChainId, currentChainId, switching, switchToExpectedChain } = useExpectedChain();

  if (!mismatch) return null;

  return (
    <div
      role="alert"
      className="bg-warning/10 border border-warning/40 text-warning rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3"
    >
      <div className="flex-1">
        <p className="m-0 font-semibold">Wrong network</p>
        <p className="m-0 text-sm opacity-80">
          Your wallet is connected to chain id <code className="font-mono">{currentChainId}</code>, but this demo
          requires Rootstock testnet (chain id <code className="font-mono">{expectedChainId}</code>). The action
          buttons are disabled until you switch.
        </p>
      </div>
      <button
        type="button"
        className="bg-brand-pink rounded-md py-1.5 px-3 text-black text-sm font-medium disabled:opacity-50 whitespace-nowrap"
        onClick={switchToExpectedChain}
        disabled={switching}
      >
        {switching ? "Switching…" : "Switch to Rootstock testnet"}
      </button>
    </div>
  );
}

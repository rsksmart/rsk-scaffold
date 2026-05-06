"use client";

import { EXAMPLE_TARGET_ADDRESS, FORWARDER_ADDRESS } from "~~/utils/gasless/config";
import type { ActionId } from "../_hooks/useGaslessDemo";

interface TransactionMethodsPanelProps {
  isRunning: (id: ActionId) => boolean;
  onDirect: () => void;
  onGasless: () => void;
  onBatch: () => void;
  /**
   * When true, every action button is disabled regardless of running
   * state — used to lock the panel on network mismatch or missing config.
   */
  disabledReason?: string;
}

interface MethodButtonProps {
  title: string;
  description: string;
  running: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}

function MethodButton({ title, description, running, disabled, label, onClick }: MethodButtonProps) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="m-0 font-semibold">{title}</h4>
      <p className="text-xs opacity-70">{description}</p>
      <button
        className="bg-brand-pink rounded-md py-1.5 px-3 text-black text-sm font-medium w-full disabled:opacity-50"
        onClick={onClick}
        disabled={disabled}
      >
        {running ? "Processing..." : label}
      </button>
    </div>
  );
}

export function TransactionMethodsPanel({
  isRunning,
  onDirect,
  onGasless,
  onBatch,
  disabledReason,
}: TransactionMethodsPanelProps) {
  const targetMissing = !EXAMPLE_TARGET_ADDRESS;
  const forwarderMissing = !FORWARDER_ADDRESS;
  const lockedOut = Boolean(disabledReason);

  return (
    <div className="bg-secondary p-4 rounded-lg w-full h-min border border-border">
      <h3 className="m-0 font-semibold">Transaction Methods</h3>
      <hr className="my-3 border-1 border-white-400 rounded-full" />
      {lockedOut && (
        <p role="status" className="text-xs opacity-80 mb-3">
          Actions disabled: {disabledReason}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        <MethodButton
          title="Direct Call"
          description="Pay gas yourself using your wallet"
          running={isRunning("direct")}
          disabled={isRunning("direct") || targetMissing || lockedOut}
          label="Add 10 Points (Pay Gas)"
          onClick={onDirect}
        />
        <MethodButton
          title="Gasless Call"
          description="Sign a message, relayer pays gas"
          running={isRunning("gasless")}
          disabled={isRunning("gasless") || targetMissing || forwarderMissing || lockedOut}
          label="Add 10 Points (Gasless)"
          onClick={onGasless}
        />
        <MethodButton
          title="Batch Gasless Call"
          description="3 transactions in 1 on-chain tx (~35% gas savings)"
          running={isRunning("batch")}
          disabled={isRunning("batch") || targetMissing || forwarderMissing || lockedOut}
          label="Add 30 Points (Batch: 5+10+15)"
          onClick={onBatch}
        />
      </div>
    </div>
  );
}

"use client";

import { EXAMPLE_TARGET_ADDRESS, FORWARDER_ADDRESS } from "~~/utils/gasless/config";
import { useNetworkColor } from "~~/hooks/scaffold-eth";

export function ContractInfoCard() {
  const networkColor = useNetworkColor();
  return (
    <div className="bg-secondary p-5 rounded-lg w-full lg:w-80 border border-border">
      <h3 className="m-0 font-semibold">Contract Information</h3>
      <hr className="my-3 border-1 border-white-400 rounded-full" />
      <div className="flex gap-3 items-center mt-4">
        <div className="text-white-400 flex flex-col gap-2">
          <div>Forwarder:</div>
          <div>Target:</div>
          <div>Network:</div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-xs font-mono break-all">{FORWARDER_ADDRESS || "Not configured"}</div>
          <div className="text-xs font-mono break-all">{EXAMPLE_TARGET_ADDRESS || "Not configured"}</div>
          <p className="my-0">
            <span style={{ color: networkColor }}>Rootstock Testnet</span>
          </p>
        </div>
      </div>
    </div>
  );
}

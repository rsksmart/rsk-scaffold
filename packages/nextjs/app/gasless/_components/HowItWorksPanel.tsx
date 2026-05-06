"use client";

export function HowItWorksPanel() {
  return (
    <div className="bg-secondary p-4 rounded-lg w-full h-min border border-border">
      <h3 className="m-0 font-semibold">How it works</h3>
      <hr className="my-3 border-1 border-white-400 rounded-full" />
      <ul className="list-disc list-inside space-y-1 text-xs">
        <li>
          <strong>Direct Call:</strong> Traditional transaction where you pay gas fees from your wallet
        </li>
        <li>
          <strong>Gasless Call:</strong> You sign an EIP-712 message, relayer submits and pays gas
        </li>
        <li>Both methods call the same contract function and achieve the same result</li>
        <li>Gasless transactions use the Forwarder contract to verify signatures</li>
      </ul>
    </div>
  );
}

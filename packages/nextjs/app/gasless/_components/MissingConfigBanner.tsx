"use client";

import { EXAMPLE_TARGET_ADDRESS, FORWARDER_ADDRESS } from "~~/utils/gasless/config";

/**
 * Renders a banner explaining why the action panel is disabled when the
 * required NEXT_PUBLIC_* env vars are not configured. The page reads the
 * same constants to actually disable the buttons; this component just
 * makes the cause visible to the user.
 */
export function MissingConfigBanner() {
  const missing: { name: string; description: string }[] = [];
  if (!FORWARDER_ADDRESS) {
    missing.push({
      name: "NEXT_PUBLIC_FORWARDER_ADDRESS",
      description: "The deployed OpenZeppelin ERC2771Forwarder contract address.",
    });
  }
  if (!EXAMPLE_TARGET_ADDRESS) {
    missing.push({
      name: "NEXT_PUBLIC_EXAMPLE_TARGET_ADDRESS",
      description: "The deployed example target contract address.",
    });
  }

  if (missing.length === 0) return null;

  return (
    <div
      role="alert"
      className="bg-error/10 border border-error/40 text-error rounded-lg p-4 flex flex-col gap-2"
    >
      <p className="m-0 font-semibold">Configuration required</p>
      <p className="m-0 text-sm opacity-90">
        The gasless demo cannot run until the following environment variable
        {missing.length > 1 ? "s are" : " is"} set in{" "}
        <code className="font-mono">packages/nextjs/.env.local</code>. See{" "}
        <code className="font-mono">packages/nextjs/.env.example</code> for the full template.
      </p>
      <ul className="list-disc list-inside text-xs space-y-1 mt-1">
        {missing.map(item => (
          <li key={item.name}>
            <code className="font-mono">{item.name}</code> — {item.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

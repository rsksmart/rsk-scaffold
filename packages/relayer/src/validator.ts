import { ForwardRequest } from "./types";
import { config } from "./config";

const MAX_GAS = 1000000n;
const MIN_GAS = 21000n;

export function validateRelayRequest(request: ForwardRequest, signature: string): {
  valid: boolean;
  error?: string;
} {
  if (!request.from || !isValidAddress(request.from)) {
    return { valid: false, error: "Invalid 'from' address" };
  }

  if (!request.to || !isValidAddress(request.to)) {
    return { valid: false, error: "Invalid 'to' address" };
  }

  // Allowlist enforcement is FAIL-CLOSED: an empty allowlist rejects all
  // requests rather than accepting them. The relayer pays gas, so an
  // unconfigured allowlist would let any caller drain the relayer wallet
  // by forwarding to attacker-chosen contracts. Operators MUST set either
  // ALLOWED_TARGETS or EXAMPLE_TARGET_ADDRESS in .env (config.ts emits a
  // startup warning when neither is present).
  const targetLower = request.to.toLowerCase();
  if (!config.allowedTargets.includes(targetLower)) {
    return { valid: false, error: "Target contract not allowed" };
  }

  if (!request.data || !request.data.startsWith("0x")) {
    return { valid: false, error: "Invalid data field" };
  }

  if (!signature || !signature.startsWith("0x") || signature.length !== 132) {
    return { valid: false, error: "Invalid signature format" };
  }

  try {
    const gas = BigInt(request.gas);
    if (gas < MIN_GAS || gas > MAX_GAS) {
      return { valid: false, error: `Gas must be between ${MIN_GAS} and ${MAX_GAS}` };
    }
  } catch {
    return { valid: false, error: "Invalid gas value" };
  }

  try {
    const value = BigInt(request.value);
    if (value !== 0n) {
      return { valid: false, error: "Value must be 0 for gasless transactions" };
    }
  } catch {
    return { valid: false, error: "Invalid value field" };
  }

  // Validate deadline (uint48 - timestamp in seconds)
  try {
    const deadline = Number(request.deadline);
    const now = Math.floor(Date.now() / 1000);
    if (deadline < now) {
      return { valid: false, error: "Request deadline has expired" };
    }
    // Check if deadline is reasonable (not more than 1 year in future)
    if (deadline > now + 365 * 24 * 60 * 60) {
      return { valid: false, error: "Deadline too far in future" };
    }
  } catch {
    return { valid: false, error: "Invalid deadline value" };
  }

  return { valid: true };
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

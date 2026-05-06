import dotenv from "dotenv";

dotenv.config();

// Validate the env var is a 0x-prefixed 40-hex-character string before
// claiming the `0x${string}` brand. Casting "" or arbitrary strings is a
// type-system lie that propagates into every viem/EIP-712 call site.
function parseAddressEnv(raw: string | undefined): `0x${string}` | undefined {
  if (!raw) return undefined;
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) return undefined;
  return raw as `0x${string}`;
}

// Parse allowed target addresses from comma-separated list
function parseAllowedTargets(): string[] {
  const targets: string[] = [];
  if (process.env.ALLOWED_TARGETS) {
    // Use ALLOWED_TARGETS if provided (comma-separated list)
    const rawTargets = process.env.ALLOWED_TARGETS.split(',');
    for (const addr of rawTargets) {
      const trimmed = addr.trim().toLowerCase();
      if (trimmed.length === 0) continue;
      // Validate address format; skip invalid entries with a warning
      if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
        console.warn(`⚠️  Skipping invalid ALLOWED_TARGETS entry: ${addr}`);
        continue;
      }
      targets.push(trimmed);
    }
  } else if (process.env.EXAMPLE_TARGET_ADDRESS) {
    // Fallback to single EXAMPLE_TARGET_ADDRESS for backward compatibility
    const trimmed = process.env.EXAMPLE_TARGET_ADDRESS.trim().toLowerCase();
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      targets.push(trimmed);
    } else {
      console.warn(`⚠️  Skipping invalid EXAMPLE_TARGET_ADDRESS: ${process.env.EXAMPLE_TARGET_ADDRESS}`);
    }
  }
  return targets;
}

// Parse allowed origins from comma-separated list
function parseAllowedOrigins(): string[] {
  const origins: string[] = [];
  if (process.env.ALLOWED_ORIGINS) {
    const rawOrigins = process.env.ALLOWED_ORIGINS.split(',');
    for (const origin of rawOrigins) {
      const trimmed = origin.trim();
      if (trimmed.length === 0) continue;
      // Validate URL format; skip invalid entries with a warning
      try {
        new URL(trimmed);
        origins.push(trimmed);
      } catch {
        console.warn(`⚠️  Skipping invalid ALLOWED_ORIGINS entry (not a valid URL): ${origin}`);
      }
    }
  }
  return origins;
}

export const config = {
  port: process.env.PORT || 3001,
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || "",
  rpcUrl: process.env.RPC_URL || "https://public-node.testnet.rsk.co",
  forwarderAddress: parseAddressEnv(process.env.FORWARDER_ADDRESS),

  // @deprecated Use allowedTargets instead. Kept for backward compatibility only.
  exampleTargetAddress: parseAddressEnv(process.env.EXAMPLE_TARGET_ADDRESS),

  allowedTargets: parseAllowedTargets(),
  allowedOrigins: parseAllowedOrigins(),
  chainId: parseInt(process.env.CHAIN_ID || "31"),
  adminApiToken: process.env.ADMIN_API_TOKEN || "",
  // When true, /health/detailed requires the bearer token even from
  // loopback. Use this when the relayer sits behind a reverse proxy on
  // the same host (so the proxy's connections appear as 127.0.0.1).
  disableLoopbackAuth: process.env.DISABLE_LOOPBACK_AUTH === "true",
  // Maximum number of requests in a batch. Configurable via env var with
  // a default of 10 and a hard cap of 100 to prevent abuse.
  batchMaxSize: Math.min(
    parseInt(process.env.BATCH_MAX_SIZE || "10"),
    100,
  ),
  // Gas padding values for single and batch transactions. Configurable via
  // env vars with sensible defaults. These add buffer to user-provided gas
  // estimates to account for EVM execution overhead.
  gasPaddingSingle: BigInt(process.env.GAS_PADDING_SINGLE || "100000"),
  gasPaddingBatch: BigInt(process.env.GAS_PADDING_BATCH || "200000"),
};

const isProduction = process.env.NODE_ENV === "production";
const MIN_ADMIN_TOKEN_LENGTH = 32;

if (config.adminApiToken) {
  if (config.adminApiToken.length < MIN_ADMIN_TOKEN_LENGTH) {
    const msg =
      `ADMIN_API_TOKEN must be at least ${MIN_ADMIN_TOKEN_LENGTH} characters ` +
      `(got ${config.adminApiToken.length}). Generate one with: ` +
      `openssl rand -hex 32`;
    if (isProduction) {
      throw new Error(`SECURITY ERROR: ${msg}`);
    }
    console.warn(`\u26a0\ufe0f  ${msg}`);
  }
} else if (isProduction && !config.disableLoopbackAuth) {
  console.warn(
    "\u26a0\ufe0f  ADMIN_API_TOKEN is not set. /health/detailed will only " +
    "respond to loopback connections. Set DISABLE_LOOPBACK_AUTH=true if the " +
    "relayer sits behind a reverse proxy.",
  );
} else if (isProduction && config.disableLoopbackAuth) {
  // Loopback bypass disabled AND no token => /health/detailed is unreachable.
  // That's safe (fail-closed) but worth a clear warning.
  console.warn(
    "\u26a0\ufe0f  DISABLE_LOOPBACK_AUTH=true but ADMIN_API_TOKEN is unset. " +
    "/health/detailed will be unreachable.",
  );
}

// Validate critical addresses in production. The relayer cannot operate
// without a valid forwarder contract address.
if (!config.forwarderAddress) {
  const msg = "FORWARDER_ADDRESS is not set or is not a valid 0x-prefixed 40-character hex address.";
  if (isProduction) {
    throw new Error(`SECURITY ERROR: ${msg} Set FORWARDER_ADDRESS in .env.`);
  }
  console.warn(`\u26a0\ufe0f  ${msg}`);
}

// Optional: Check relayer balance at startup and warn if low. This is a
// best-effort check that may fail in development (e.g., if RPC is unreachable).
// We catch errors and continue to avoid blocking startup in non-production.
if (!isProduction || config.relayerPrivateKey) {
  try {
    // Dynamic import to avoid circular dependency (config.ts is imported by relayer.ts)
    // We'll do the check in index.ts after relayer.ts is loaded.
  } catch {
    // Ignore errors in development
  }
}

if (!config.relayerPrivateKey) {
  console.warn("⚠️  RELAYER_PRIVATE_KEY not set in .env");
}

if (!config.exampleTargetAddress && config.allowedTargets.length === 0) {
  console.warn("⚠️  EXAMPLE_TARGET_ADDRESS or ALLOWED_TARGETS not set in .env");
}

if (config.allowedTargets.length === 0) {
  // Fail-closed: validator.ts rejects every request when the allowlist is
  // empty. Make the operational consequence loud at startup so an operator
  // who forgets to configure ALLOWED_TARGETS / EXAMPLE_TARGET_ADDRESS
  // doesn't discover the relayer is rejecting everything from logs only.
  console.warn(
    "\u26a0\ufe0f  No target contracts configured in allowlist. " +
    "ALL relay requests will be rejected with \"Target contract not allowed\". " +
    "Set ALLOWED_TARGETS (comma-separated) or EXAMPLE_TARGET_ADDRESS in .env to enable relaying.",
  );
}

if (config.allowedOrigins.length > 0) {
  // Allowed CORS origins configured
  config.allowedOrigins.forEach((origin, idx) => {
    // CORS origin listed
  });
} else {
  console.warn("⚠️  No CORS origins configured - allowing all origins (development mode)");
}

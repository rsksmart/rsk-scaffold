export const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || "http://localhost:3001";

// Validate the env var is a 0x-prefixed 40-hex-character string before
// claiming the `0x${string}` brand. Casting "" or arbitrary strings is a
// type-system lie that propagates into every viem/EIP-712 call site, which
// only catches the bug at runtime (often as an opaque RPC error).
function parseAddressEnv(raw: string | undefined): `0x${string}` | undefined {
  if (!raw) return undefined;
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) return undefined;
  return raw as `0x${string}`;
}

export const FORWARDER_ADDRESS: `0x${string}` | undefined = parseAddressEnv(
  process.env.NEXT_PUBLIC_FORWARDER_ADDRESS,
);

export const EXAMPLE_TARGET_ADDRESS: `0x${string}` | undefined = parseAddressEnv(
  process.env.NEXT_PUBLIC_EXAMPLE_TARGET_ADDRESS,
);

export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31");

// Warn (once) when a non-loopback HTTP relayer URL is used in production.
// Plaintext HTTP exposes signed meta-transaction payloads to network
// observers and to TLS-stripping man-in-the-middle attacks.
if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
  try {
    const parsed = new URL(RELAYER_URL);
    const isLoopback =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1";
    if (parsed.protocol === "http:" && !isLoopback) {
      // eslint-disable-next-line no-console
      console.warn(
        `\u26a0\ufe0f  SECURITY WARNING: NEXT_PUBLIC_RELAYER_URL is plaintext HTTP (${RELAYER_URL}). ` +
          "Use https:// in production to protect signed meta-transactions in transit.",
      );
    }
  } catch {
    // eslint-disable-next-line no-console
    console.warn(`\u26a0\ufe0f  NEXT_PUBLIC_RELAYER_URL is not a valid URL: ${RELAYER_URL}`);
  }
}

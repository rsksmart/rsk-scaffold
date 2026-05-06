import { CHAIN_ID, FORWARDER_ADDRESS } from "./config";
import { getNonce } from "./relayerClient";
import { EIP712_TYPES, ForwardRequest, getEIP712Domain } from "./types";
import { WalletClient } from "viem";

// Validate address format before signing to prevent malformed addresses
// from producing signatures bound to invalid data.
function validateAddress(addr: string): `0x${string}` {
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    throw new Error(`Invalid address format: ${addr}`);
  }
  return addr as `0x${string}`;
}

export async function signMetaTransaction(walletClient: WalletClient, request: ForwardRequest): Promise<string> {
  if (!FORWARDER_ADDRESS) {
    throw new Error("FORWARDER_ADDRESS is not configured (set NEXT_PUBLIC_FORWARDER_ADDRESS).");
  }
  const domain = getEIP712Domain(CHAIN_ID, FORWARDER_ADDRESS);

  const account = walletClient.account;
  if (!account) {
    throw new Error("No account connected");
  }

  // Validate addresses before signing
  const from = validateAddress(request.from);
  const to = validateAddress(request.to);

  // Fetch nonce from contract (not included in ForwardRequest struct)
  const nonce = await getNonce(request.from);

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types: EIP712_TYPES,
    primaryType: "ForwardRequest",
    message: {
      from,
      to,
      value: BigInt(request.value),
      gas: BigInt(request.gas),
      nonce: nonce, // Fetched from contract, not from request
      deadline: Number(request.deadline), // OpenZeppelin uses uint48 as number
      data: request.data as `0x${string}`,
    },
  });

  return signature;
}

// For batch transactions: sign with a specific nonce (not fetched)
export async function signMetaTransactionWithNonce(
  walletClient: WalletClient,
  request: ForwardRequest,
  nonce: bigint,
): Promise<string> {
  if (!FORWARDER_ADDRESS) {
    throw new Error("FORWARDER_ADDRESS is not configured (set NEXT_PUBLIC_FORWARDER_ADDRESS).");
  }
  const domain = getEIP712Domain(CHAIN_ID, FORWARDER_ADDRESS);

  const account = walletClient.account;
  if (!account) {
    throw new Error("No account connected");
  }

  // Validate addresses before signing
  const from = validateAddress(request.from);
  const to = validateAddress(request.to);

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types: EIP712_TYPES,
    primaryType: "ForwardRequest",
    message: {
      from,
      to,
      value: BigInt(request.value),
      gas: BigInt(request.gas),
      nonce: nonce, // Use provided nonce for batch
      deadline: Number(request.deadline),
      data: request.data as `0x${string}`,
    },
  });

  return signature;
}

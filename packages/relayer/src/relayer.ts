import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { rootstockTestnet } from "viem/chains";
import { config } from "./config";
import { forwarderAbi } from "./abi";
import { ForwardRequest } from "./types";
import { errorMessage } from "./errorHandler";

// Ensure forwarderAddress is configured before any RPC call. The config
// validation in config.ts hard-throws in production if it's missing, but
// this runtime check provides a clear error message in development.
function requireForwarderAddress(): `0x${string}` {
  if (!config.forwarderAddress) {
    throw new Error(
      "FORWARDER_ADDRESS is not configured or is not a valid address. " +
      "Set FORWARDER_ADDRESS in .env.",
    );
  }
  return config.forwarderAddress;
}

// Validate address format before RPC calls to prevent malformed input
// from reaching the RPC node. This is a defense-in-depth measure; the
// validator.ts also validates addresses in the request body.
function validateAddress(addr: string): `0x${string}` {
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    throw new Error(`Invalid address format: ${addr}`);
  }
  return addr as `0x${string}`;
}

const publicClient = createPublicClient({
  chain: rootstockTestnet,
  transport: http(config.rpcUrl, {
    timeout: 30_000, // 30 second timeout on RPC calls to prevent hangs
  }),
});

const account = privateKeyToAccount(config.relayerPrivateKey as `0x${string}`);

const walletClient = createWalletClient({
  account,
  chain: rootstockTestnet,
  transport: http(config.rpcUrl, {
    timeout: 30_000, // 30 second timeout on RPC calls to prevent hangs
  }),
});

export async function verifyRequest(request: ForwardRequest, signature: string): Promise<boolean> {
  try {
    const forwarderAddr = requireForwarderAddress();
    const from = validateAddress(request.from);
    const to = validateAddress(request.to);
    // OpenZeppelin's verify expects ForwardRequestData (with signature included)
    const isValid = await publicClient.readContract({
      address: forwarderAddr,
      abi: forwarderAbi,
      functionName: "verify",
      args: [
        {
          from,
          to,
          value: BigInt(request.value),
          gas: BigInt(request.gas),
          deadline: Number(request.deadline), // uint48 in Solidity
          data: request.data as `0x${string}`,
          signature: signature as `0x${string}`,
        },
      ],
    });

    return isValid;
  } catch (error) {
    console.error("Verification error:", error);
    return false;
  }
}

export async function executeMetaTransaction(
  request: ForwardRequest,
  signature: string
): Promise<string> {
  try {
    const forwarderAddr = requireForwarderAddress();
    const from = validateAddress(request.from);
    const to = validateAddress(request.to);
    // OpenZeppelin's execute expects ForwardRequestData (with signature included)
    const hash = await walletClient.writeContract({
      address: forwarderAddr,
      abi: forwarderAbi,
      functionName: "execute",
      args: [
        {
          from,
          to,
          value: BigInt(request.value),
          gas: BigInt(request.gas),
          deadline: Number(request.deadline), // uint48 in Solidity
          data: request.data as `0x${string}`,
          signature: signature as `0x${string}`,
        },
      ],
      gas: BigInt(request.gas) + config.gasPaddingSingle,
      value: BigInt(request.value), // Include value if non-zero
    });

    return hash;
  } catch (error: unknown) {
    console.error("❌ Execute contract call failed:");
    console.error("Error message:", errorMessage(error));
    const viemError = error as { details?: unknown; shortMessage?: unknown; cause?: unknown };
    console.error("Error details:", viemError.details || viemError.shortMessage);
    if (viemError.cause) {
      console.error("Cause:", viemError.cause);
    }
    throw error;
  }
}

export async function getTransactionStatus(txHash: string) {
  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    return {
      status: receipt.status === "success" ? "confirmed" : "failed",
      blockNumber: receipt.blockNumber.toString(),
    };
  } catch (error) {
    try {
      const tx = await publicClient.getTransaction({
        hash: txHash as `0x${string}`,
      });

      if (tx) {
        return {
          status: "pending",
        };
      }
    } catch (fallbackError) {
      // Both getTransactionReceipt and getTransaction failed
      // Transaction likely doesn't exist or there's a network issue
    }

    return {
      status: "not_found",
    };
  }
}

export async function getNonce(address: string): Promise<bigint> {
  const forwarderAddr = requireForwarderAddress();
  const validatedAddr = validateAddress(address);
  // OpenZeppelin uses 'nonces' (plural) instead of 'getNonce'
  const nonce = await publicClient.readContract({
    address: forwarderAddr,
    abi: forwarderAbi,
    functionName: "nonces",
    args: [validatedAddr],
  });

  return nonce;
}

export async function getRelayerBalance(): Promise<string> {
  const balance = await publicClient.getBalance({
    address: account.address,
  });

  return balance.toString();
}

// Batches are forced into atomic-execution mode (zero refundReceiver). A
// non-zero refundReceiver enables non-atomic execution, which lets a caller
// craft entries that fail-but-still-burn-gas in order to drain the relayer's
// RBTC into the receiver. We reject any caller-supplied non-zero value.
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export async function executeBatchMetaTransactions(
  requests: ForwardRequest[],
  signatures: string[],
  refundReceiver?: string,
): Promise<string> {
  if (requests.length !== signatures.length) {
    throw new Error("Requests and signatures length mismatch");
  }

  // Reject any caller-supplied refundReceiver other than the zero address.
  // This forces atomic batch semantics and removes the incremental-drain vector.
  if (refundReceiver && refundReceiver.toLowerCase() !== ZERO_ADDRESS) {
    throw new Error(
      "refundReceiver must be the zero address; non-atomic batch execution is disabled",
    );
  }

  // Build ForwardRequestData array with signatures included
  const requestsData = requests.map((request, index) => {
    const from = validateAddress(request.from);
    const to = validateAddress(request.to);
    return {
      from,
      to,
      value: BigInt(request.value),
      gas: BigInt(request.gas),
      deadline: Number(request.deadline),
      data: request.data as `0x${string}`,
      signature: signatures[index] as `0x${string}`,
    };
  });

  // Calculate total value needed
  const totalValue = requests.reduce((sum, req) => sum + BigInt(req.value), 0n);

  const forwarderAddr = requireForwarderAddress();
  const hash = await walletClient.writeContract({
    address: forwarderAddr,
    abi: forwarderAbi,
    functionName: "executeBatch",
    args: [requestsData, ZERO_ADDRESS],
    gas: requests.reduce((sum, req) => sum + BigInt(req.gas), 0n) + config.gasPaddingBatch, // Extra gas for batch overhead
    value: totalValue,
  });

  return hash;
}

export { publicClient };

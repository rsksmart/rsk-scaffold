import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ERC2771Forwarder } from "../../typechain-types/@openzeppelin/contracts/metatx";

// OpenZeppelin ERC2771Forwarder EIP-712 type description.
// Note: `nonce` is part of the signed payload but NOT of the on-chain
// ForwardRequest struct passed to execute()/executeBatch(); the contract
// reads it from internal state.
export const EIP712_TYPES = {
  ForwardRequest: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint48" },
    { name: "data", type: "bytes" },
  ],
} as const;

export interface SignedForwardRequest {
  from: string;
  to: string;
  value: bigint;
  gas: bigint;
  deadline: number;
  data: string;
  signature: string;
}

/**
 * Build and EIP-712 sign an OpenZeppelin ERC2771 ForwardRequest.
 *
 * Pass `explicitNonce` to override the on-chain nonce — required when
 * pre-signing multiple requests for a batch (the contract increments
 * nonces sequentially during executeBatch, so the second/third request
 * must be signed with `currentNonce + 1`, `currentNonce + 2`, etc.).
 *
 * Signature mirrors the previous per-file copies so call sites only need
 * to prepend `forwarder` as the first argument.
 */
export async function createSignedRequest(
  forwarder: ERC2771Forwarder,
  from: string,
  to: string,
  value: bigint,
  gas: bigint,
  deadline: number,
  data: string,
  signer: SignerWithAddress,
  explicitNonce?: bigint,
): Promise<SignedForwardRequest> {
  const nonce = explicitNonce !== undefined ? explicitNonce : await forwarder.nonces(from);

  const requestToSign = { from, to, value, gas, nonce, deadline, data };

  const domain = await forwarder.eip712Domain();
  const domainData = {
    name: domain.name,
    version: domain.version,
    chainId: domain.chainId,
    verifyingContract: await forwarder.getAddress(),
  };

  // ethers' signTypedData wants a mutable type table; widen the readonly
  // EIP712_TYPES literal before passing.
  const signature = await signer.signTypedData(
    domainData,
    EIP712_TYPES as unknown as Record<string, Array<{ name: string; type: string }>>,
    requestToSign,
  );

  // execute()/executeBatch() take the request WITHOUT the `nonce` field.
  return { from, to, value, gas, deadline, data, signature };
}

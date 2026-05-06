// OpenZeppelin ERC2771Forwarder ForwardRequest
// Note: nonce is NOT in the struct - it's retrieved from contract state
export interface ForwardRequest {
  from: string;
  to: string;
  value: string;
  gas: string;
  deadline: string; // uint48 in Solidity
  data: string;
}

// For signing: includes nonce (retrieved from contract)
export interface ForwardRequestToSign extends ForwardRequest {
  nonce: string;
}

export interface RelayRequest {
  request: ForwardRequest;
  signature: string;
}

export interface RelayResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

// Helper function to get EIP712 domain with dynamic chainId
export function getEIP712Domain(chainId: number, verifyingContract: `0x${string}`) {
  return {
    name: "RSKForwarder",
    version: "1", // OpenZeppelin default version
    chainId,
    verifyingContract,
  };
}

// OpenZeppelin ERC2771Forwarder EIP712 types
// Note: nonce is included in signature but not in struct
export const EIP712_TYPES = {
  ForwardRequest: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" }, // Implicit - from contract state
    { name: "deadline", type: "uint48" }, // Note: uint48 not uint256
    { name: "data", type: "bytes" },
  ],
};

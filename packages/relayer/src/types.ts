// OpenZeppelin ERC2771Forwarder ForwardRequestData structure
// Note: nonce is NOT in the struct - it's retrieved from contract state
// The signature IS part of the struct for OpenZeppelin
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

// For execution: includes signature
export interface ForwardRequestData extends ForwardRequest {
  signature: string;
}

// Legacy interface for backward compatibility
export interface RelayRequest {
  request: ForwardRequest;
  signature: string;
}

export interface RelayResponse {
  success: boolean;
  txHash?: string;
  error?: string;
}

// Batch relay request
export interface BatchRelayRequest {
  requests: RelayRequest[];
  refundReceiver?: string; // Optional: for non-atomic batch execution
}

// Batch relay response
export interface BatchRelayResponse {
  success: boolean;
  txHash?: string;
  executedCount?: number;
  failedCount?: number;
  error?: string;
}

export interface StatusResponse {
  txHash: string;
  status: "pending" | "confirmed" | "failed" | "not_found";
  blockNumber?: string;
  error?: string;
}

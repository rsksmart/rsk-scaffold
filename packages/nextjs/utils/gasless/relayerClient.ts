import { RELAYER_URL } from "./config";
import { RelayRequest, RelayResponse } from "./types";

// Bound all relayer requests so the UI never hangs indefinitely on a slow
// or stuck transaction. The relayer also caps its own receipt wait at 60s
// and returns the txHash so callers can poll GET /status/:txHash.
const RELAYER_FETCH_TIMEOUT_MS = 15_000;

function relayerFetchSignal(): AbortSignal {
  return AbortSignal.timeout(RELAYER_FETCH_TIMEOUT_MS);
}

function wrapAbortError(err: unknown, fallback: string): Error {
  if (err instanceof DOMException && err.name === "TimeoutError") {
    return new Error(`Relayer request timed out after ${RELAYER_FETCH_TIMEOUT_MS / 1000}s`);
  }
  if (err instanceof Error) return err;
  return new Error(fallback);
}

// HTTP error carrying the original status so callers can branch on it.
export class RelayerHttpError extends Error {
  status: number;
  statusText: string;
  constructor(message: string, status: number, statusText: string) {
    super(message);
    this.name = "RelayerHttpError";
    this.status = status;
    this.statusText = statusText;
  }
}

// Safely build an Error from a non-OK response. Many failure modes
// (502/503/504 from a reverse proxy, HTML error pages, empty bodies)
// return non-JSON, so response.json() can throw SyntaxError and mask
// the original HTTP status. We tolerate that and always surface the
// status code in the resulting Error.
async function errorFromResponse(response: Response, fallback: string): Promise<RelayerHttpError> {
  let detail = "";
  try {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await response.json();
      detail = (body && (body.error || body.message)) || "";
    } else {
      const text = await response.text();
      // Avoid dumping huge HTML pages into the error message.
      detail = text.slice(0, 200).trim();
    }
  } catch {
    // Body was unreadable / not JSON despite the header. Fall through.
  }
  const statusPart = `HTTP ${response.status} ${response.statusText}`.trim();
  const message = detail ? `${fallback}: ${statusPart} — ${detail}` : `${fallback}: ${statusPart}`;
  return new RelayerHttpError(message, response.status, response.statusText);
}

export async function relayTransaction(relayRequest: RelayRequest): Promise<RelayResponse> {
  let response: Response;
  try {
    response = await fetch(`${RELAYER_URL}/relay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(relayRequest),
      signal: relayerFetchSignal(),
    });
  } catch (err) {
    throw wrapAbortError(err, "Failed to relay transaction");
  }

  if (!response.ok) {
    throw await errorFromResponse(response, "Failed to relay transaction");
  }

  return response.json();
}

export async function getTransactionStatus(txHash: string) {
  let response: Response;
  try {
    response = await fetch(`${RELAYER_URL}/status/${txHash}`, {
      signal: relayerFetchSignal(),
    });
  } catch (err) {
    throw wrapAbortError(err, "Failed to get transaction status");
  }

  if (!response.ok) {
    throw await errorFromResponse(response, "Failed to get transaction status");
  }

  return response.json();
}

export async function getNonce(address: string): Promise<bigint> {
  let response: Response;
  try {
    response = await fetch(`${RELAYER_URL}/nonce/${address}`, {
      signal: relayerFetchSignal(),
    });
  } catch (err) {
    throw wrapAbortError(err, "Failed to get nonce");
  }

  if (!response.ok) {
    throw await errorFromResponse(response, "Failed to get nonce");
  }

  const data = await response.json();
  return BigInt(data.nonce);
}

export async function relayBatchTransactions(requests: RelayRequest[]): Promise<RelayResponse> {
  let response: Response;
  try {
    response = await fetch(`${RELAYER_URL}/relay/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
      signal: relayerFetchSignal(),
    });
  } catch (err) {
    throw wrapAbortError(err, "Failed to relay batch transactions");
  }

  if (!response.ok) {
    throw await errorFromResponse(response, "Failed to relay batch transactions");
  }

  return response.json();
}

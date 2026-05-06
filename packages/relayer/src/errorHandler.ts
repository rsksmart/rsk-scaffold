/**
 * Error sanitization utility
 * Prevents sensitive internal error details from being exposed to clients
 */

interface SanitizedError {
  message: string;
  code?: string;
}

// Type-safe extraction of a user-visible message from a thrown value.
// catch (error: unknown) preserves TypeScript's narrowing; this helper
// extracts a message safely for both Error objects and non-Error throws.
export function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    // viem error subclasses expose a friendlier `shortMessage` field.
    const short = (err as { shortMessage?: unknown }).shortMessage;
    if (typeof short === "string" && short.length > 0) return short;
    return err.message;
  }
  // Non-Error throws (e.g., `throw "boom"`) fall back to String representation.
  return String(err);
}

/**
 * Sanitizes error messages for client responses
 * Logs detailed errors server-side only
 */
export function sanitizeError(error: unknown, context: string): SanitizedError {
  // Log detailed error server-side
  console.error(`[${context}] Detailed error:`, {
    message: errorMessage(error),
    stack: error instanceof Error ? error.stack : undefined,
    code: error instanceof Error ? (error as { code?: unknown }).code : undefined,
    details: error,
  });

  // Return generic error to client based on error type
  const errorCode = error instanceof Error ? (error as { code?: string }).code : undefined;
  const errorMsg = errorMessage(error);

  if (errorCode === "INSUFFICIENT_FUNDS") {
    return {
      message: "Relayer has insufficient funds",
      code: "RELAYER_ERROR",
    };
  }

  if (errorCode === "NONCE_EXPIRED" || errorMsg.includes("nonce")) {
    return {
      message: "Invalid request",
      code: "INVALID_REQUEST",
    };
  }

  if (errorCode === "CALL_EXCEPTION" || errorMsg.includes("revert")) {
    return {
      message: "Transaction failed",
      code: "TRANSACTION_FAILED",
    };
  }

  if (errorCode === "NETWORK_ERROR" || errorMsg.includes("network")) {
    return {
      message: "Network error occurred",
      code: "NETWORK_ERROR",
    };
  }

  if (errorCode === "TIMEOUT") {
    return {
      message: "Request timed out",
      code: "TIMEOUT",
    };
  }

  // Default generic error
  return {
    message: "An error occurred processing your request",
    code: "INTERNAL_ERROR",
  };
}

/**
 * Safe error message for validation errors
 * These can be more specific since they don't expose internal state
 */
export function sanitizeValidationError(error: string): string {
  // Validation errors are safe to return as-is since they don't expose internals
  // But we still want to ensure they don't contain any unexpected data
  // Keep this list in lockstep with validator.ts. Each entry must match
  // the EXACT string (or prefix) produced by validateRelayRequest so that
  // legitimate validation errors are surfaced verbatim to the client
  // instead of being collapsed into the generic "Invalid request parameters"
  // fallback below.
  const safeErrors = [
    "Invalid 'from' address",
    "Invalid 'to' address",
    "Invalid data field",
    "Invalid signature format",
    "Gas must be between",
    "Invalid gas value",
    "Value must be 0 for gasless transactions",
    "Invalid value field",
    "Invalid nonce value",
    "Target contract not allowed",
    "Request deadline has expired",
    "Deadline too far in future",
    "Invalid deadline value",
  ];

  // Check if error starts with any safe error prefix
  for (const safeError of safeErrors) {
    if (error.startsWith(safeError)) {
      return error;
    }
  }

  // If not a recognized validation error, return generic message
  return "Invalid request parameters";
}

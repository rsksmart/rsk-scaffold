import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import crypto from "crypto";
import { config } from "./config";
import { RelayRequest, RelayResponse, StatusResponse, BatchRelayRequest, BatchRelayResponse } from "./types";
import { validateRelayRequest, isValidAddress } from "./validator";
import {
  verifyRequest,
  executeMetaTransaction,
  executeBatchMetaTransactions,
  getTransactionStatus,
  getNonce,
  publicClient,
  getRelayerBalance,
} from "./relayer";
import { parseEther } from "viem";
import {
  ipRateLimiter,
  ipHourlyRateLimiter,
  addressRateLimiter,
  concurrentRequestLimiter,
  checkDailyBudget,
  trackGasSpent,
  getRemainingBudget,
  recordAddressUsage,
} from "./rateLimiter";
import { sanitizeError, sanitizeValidationError, errorMessage } from "./errorHandler";

const app = express();

// Explicitly disable proxy trust. The loopback gate on /health/detailed
// relies on req.socket.remoteAddress, but disabling trust proxy also makes
// req.ip / X-Forwarded-For non-authoritative everywhere, preventing future
// code from accidentally trusting spoofable headers.
app.set("trust proxy", false);

// Suppress framework fingerprinting via X-Powered-By.
app.disable("x-powered-by");

// Apply secure default response headers (X-Frame-Options, CSP, HSTS, etc.).
// This is a JSON API consumed by browsers cross-origin, so we keep helmet's
// defaults: no inline scripts, deny framing, HSTS for HTTPS deployments.
// crossOriginResourcePolicy is relaxed so legitimate cross-origin browsers
// (already gated by the explicit CORS allowlist) can read responses.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Validate CORS configuration at startup.
// Hard-error in non-development environments when no allowlist is set to
// prevent credentialed CSRF via reflective CORS.
if (config.allowedOrigins.length === 0) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!isDevelopment) {
    throw new Error(
      'SECURITY ERROR: ALLOWED_ORIGINS is not configured. ' +
      'Set ALLOWED_ORIGINS to a comma-separated list of trusted origins, ' +
      'or set NODE_ENV=development for local development.'
    );
  }
  console.warn(
    '⚠️  SECURITY WARNING: ALLOWED_ORIGINS not configured. ' +
    'Cross-origin requests are disabled (origin: false, credentials: false).'
  );
}

// Configure CORS strictly:
// - origin: false when no allowlist (never reflect-any-origin)
// - credentials: true only with an explicit allowlist (never combine with reflective CORS)
const corsOptions: cors.CorsOptions = {
  origin: config.allowedOrigins.length > 0 ? config.allowedOrigins : false,
  credentials: config.allowedOrigins.length > 0,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Parse JSON request bodies
app.use(express.json());

const PORT = config.port;

// Startup health checks: verify RPC reachability and relayer balance
async function runStartupChecks() {
  const isProduction = process.env.NODE_ENV === "production";

  // RPC reachability check with timeout
  try {
    await Promise.race([
      publicClient.getBlockNumber(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("RPC timeout")), 10_000)
      ),
    ]);
    console.log("✅ RPC connection verified");
  } catch (error) {
    const msg = `RPC unreachable at ${config.rpcUrl}`;
    if (isProduction) {
      throw new Error(`SECURITY ERROR: ${msg}`);
    }
    console.warn(`⚠️  ${msg}. Relayer may not function correctly.`);
  }

  // Relayer balance check (best-effort)
  try {
    const balance = await getRelayerBalance();
    const balanceWei = BigInt(balance);
    const minBalance = parseEther("0.001"); // 0.001 RBTC minimum

    if (balanceWei < minBalance) {
      console.warn(`⚠️  Low relayer balance: ${balance} RBTC. Minimum recommended: 0.001 RBTC`);
    } else {
      console.log(`✅ Relayer balance: ${balance} RBTC`);
    }
  } catch (error) {
    console.warn("⚠️  Could not check relayer balance at startup:", errorMessage(error));
  }
}

app.use(concurrentRequestLimiter);

app.get("/", (req: Request, res: Response) => {
  res.json({
    service: "RSK Meta-Transaction Relayer",
    version: "0.0.1",
    chainId: config.chainId,
    forwarder: config.forwarderAddress,
  });
});

app.post("/relay", ipRateLimiter, ipHourlyRateLimiter, addressRateLimiter, async (req: Request, res: Response) => {
  try {
    const { request, signature } = req.body as RelayRequest;

    // Relay request received

    // Check daily budget
    if (!checkDailyBudget()) {
      // Daily budget check failed - returning 503
      return res.status(503).json({
        success: false,
        error: "Service temporarily unavailable: Daily gas budget exceeded",
      } as RelayResponse);
    }

    const validation = validateRelayRequest(request, signature);
    if (!validation.valid) {
      // Request validation failed
      return res.status(400).json({
        success: false,
        error: sanitizeValidationError(validation.error || "Invalid request"),
      } as RelayResponse);
    }

    // Verify signature and nonce before execution to prevent gas drain
    const isValidSignature = await verifyRequest(request, signature);
    if (!isValidSignature) {
      // Signature verification failed
      return res.status(400).json({
        success: false,
        error: "Invalid signature or nonce",
      } as RelayResponse);
    }

    // Only now (after on-chain signature verification) increment the
    // per-address rate-limit counter. This prevents grievance-DoS where an
    // attacker submits invalid requests with a victim's `from` address.
    const usage = recordAddressUsage(request.from);
    if (!usage.allowed) {
      return res.status(usage.status || 429).json({
        success: false,
        error: usage.error || "Rate limit exceeded",
      } as RelayResponse);
    }

    // Validation passed, executing meta-transaction

    let txHash: string;
    try {
      txHash = await executeMetaTransaction(request, signature);
      // Meta-transaction submitted successfully
    } catch (execError: unknown) {
      console.error("❌ Execution failed:", errorMessage(execError));
      console.error("Full error:", execError);
      const sanitized = sanitizeError(execError, "relay");
      return res.status(400).json({
        success: false,
        error: sanitized.message,
      } as RelayResponse);
    }

    // Wait for transaction receipt with a hard timeout to bound connection
    // duration. If the tx is slow/stuck, free the concurrency slot and let
    // the client poll GET /status/:txHash for inclusion details.
    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
        timeout: 60_000,
      });
      // Track actual gas spent using receipt data
      trackGasSpent(receipt.gasUsed, receipt.effectiveGasPrice);
    } catch (waitError: unknown) {
      console.warn(
        `⚠️  Receipt wait timed out for ${txHash}; returning txHash for client polling.`,
      );
    }

    res.json({
      success: true,
      txHash,
    } as RelayResponse);
  } catch (error: unknown) {
    const sanitized = sanitizeError(error, "relay");
    res.status(500).json({
      success: false,
      error: sanitized.message,
    } as RelayResponse);
  }
});

// Batch relay endpoint
app.post(
  "/relay/batch",
  ipRateLimiter,
  ipHourlyRateLimiter,
  addressRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const batchRequest = req.body as BatchRelayRequest;

      // Validate requests array exists and is an array
      if (!batchRequest || !batchRequest.requests || !Array.isArray(batchRequest.requests)) {
        return res.status(400).json({
          success: false,
          error: "Invalid batch request format",
        } as BatchRelayResponse);
      }

      if (batchRequest.requests.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Batch must contain at least one request",
        } as BatchRelayResponse);
      }

      // Validate batch size (configurable via BATCH_MAX_SIZE, hard-capped at 100)
      if (batchRequest.requests.length > config.batchMaxSize) {
        return res.status(400).json({
          success: false,
          error: `Batch size is limited to ${config.batchMaxSize} requests`,
        } as BatchRelayResponse);
      }

      // Reject caller-supplied refundReceiver other than the zero address.
      // Non-atomic batch execution is disabled to prevent incremental drain
      // via crafted-to-fail entries that still consume gas.
      if (
        batchRequest.refundReceiver &&
        batchRequest.refundReceiver.toLowerCase() !== "0x0000000000000000000000000000000000000000"
      ) {
        return res.status(400).json({
          success: false,
          error: "refundReceiver must be the zero address; non-atomic batch execution is disabled",
        } as BatchRelayResponse);
      }

      // Batch relay request received

      // Validate all requests
      const validationErrors: string[] = [];
      for (let i = 0; i < batchRequest.requests.length; i++) {
        const { request, signature } = batchRequest.requests[i];
        const validation = validateRelayRequest(request, signature);
        if (!validation.valid) {
          validationErrors.push(`Request ${i}: ${validation.error}`);
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Validation failed: ${validationErrors.join("; ")}`,
        } as BatchRelayResponse);
      }

      // Check daily budget before expensive signature verification RPC calls
      if (!checkDailyBudget()) {
        return res.status(503).json({
          success: false,
          error: "Service temporarily unavailable: Daily gas budget exceeded",
        } as BatchRelayResponse);
      }

      // Verify all signatures before execution to prevent gas drain
      const signatureVerificationErrors: string[] = [];
      for (let i = 0; i < batchRequest.requests.length; i++) {
        const { request, signature } = batchRequest.requests[i];
        const isValidSignature = await verifyRequest(request, signature);
        if (!isValidSignature) {
          signatureVerificationErrors.push(`Request ${i}: Invalid signature or nonce`);
        }
      }

      if (signatureVerificationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Signature verification failed: ${signatureVerificationErrors.join("; ")}`,
        } as BatchRelayResponse);
      }

      // Only now (after every signature has been verified) increment the
      // per-address rate-limit counters for each verified signer. This
      // prevents grievance-DoS via the unverified `from` field.
      for (let i = 0; i < batchRequest.requests.length; i++) {
        const usage = recordAddressUsage(batchRequest.requests[i].request.from);
        if (!usage.allowed) {
          return res.status(usage.status || 429).json({
            success: false,
            error: `Request ${i}: ${usage.error || "Rate limit exceeded"}`,
          } as BatchRelayResponse);
        }
      }

      // Extract requests and signatures
      const requests = batchRequest.requests.map(r => r.request);
      const signatures = batchRequest.requests.map(r => r.signature);

      // Execute batch
      const txHash = await executeBatchMetaTransactions(
        requests,
        signatures,
        batchRequest.refundReceiver,
      );

      // Batch executed successfully

      // Wait for transaction receipt with a hard timeout to bound connection
      // duration. If the tx is slow/stuck, free the concurrency slot and let
      // the client poll GET /status/:txHash for inclusion details.
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash as `0x${string}`,
          timeout: 60_000,
        });
        // Track actual gas spent using receipt data
        trackGasSpent(receipt.gasUsed, receipt.effectiveGasPrice);
      } catch (waitError: unknown) {
        console.warn(
          `⚠️  Batch receipt wait timed out for ${txHash}; returning txHash for client polling.`,
        );
      }

      res.json({
        success: true,
        txHash,
        executedCount: batchRequest.requests.length,
        failedCount: 0,
      } as BatchRelayResponse);
    } catch (error: unknown) {
      console.error("❌ Batch relay error:", error);
      const sanitized = sanitizeError(error, "batch_relay");
      res.status(500).json({
        success: false,
        error: sanitized.message,
      } as BatchRelayResponse);
    }
  },
);

app.get("/status/:txHash", ipRateLimiter, async (req: Request, res: Response) => {
  try {
    const { txHash } = req.params;

    // Validate txHash format (0x followed by 64 hex characters)
    const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
    if (!txHashRegex.test(txHash)) {
      return res.status(400).json({
        txHash,
        status: "not_found",
        error: "Invalid transaction hash format",
      } as StatusResponse);
    }

    // Status check requested

    const status = await getTransactionStatus(txHash);

    res.json({
      txHash,
      ...status,
    } as StatusResponse);
  } catch (error: unknown) {
    const sanitized = sanitizeError(error, "status");
    res.status(500).json({
      txHash: req.params.txHash,
      status: "not_found",
      error: sanitized.message,
    } as StatusResponse);
  }
});

app.get("/nonce/:address", ipRateLimiter, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Validate the address format before forwarding to the RPC. Without
    // this, malformed input reaches viem.readContract and surfaces as a
    // 500 (and may consume RPC quota).
    if (!isValidAddress(address)) {
      return res.status(400).json({
        error: "Invalid address format",
      });
    }

    const nonce = await getNonce(address);

    res.json({
      address,
      nonce: nonce.toString(),
    });
  } catch (error: unknown) {
    const sanitized = sanitizeError(error, "nonce");
    res.status(500).json({
      error: sanitized.message,
    });
  }
});

// Public /health: returns only a coarse status enum. Financial details
// (relayer balance, remaining budget) are intentionally omitted to prevent
// attackers from timing exploits against periods of low funds. Detailed
// information is exposed via /health/detailed (localhost or admin token).
app.get("/health", async (_req: Request, res: Response) => {
  try {
    const budgetAvailable = checkDailyBudget();
    res.json({
      status: budgetAvailable ? "healthy" : "degraded",
    });
  } catch {
    res.status(500).json({ status: "unhealthy" });
  }
});

// Loopback / admin-token gate for privileged endpoints.
function isLoopbackRequest(req: Request): boolean {
  // Use the raw socket address rather than req.ip so X-Forwarded-For headers
  // from upstream proxies cannot be spoofed to claim a loopback origin.
  const remote = req.socket.remoteAddress || "";
  return (
    remote === "127.0.0.1" ||
    remote === "::1" ||
    remote === "::ffff:127.0.0.1"
  );
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function isAuthorizedAdmin(req: Request): boolean {
  // Loopback bypass is opt-out: when the relayer sits behind a reverse
  // proxy on the same host, set DISABLE_LOOPBACK_AUTH=true so a bearer
  // token is always required.
  if (!config.disableLoopbackAuth && isLoopbackRequest(req)) return true;
  if (!config.adminApiToken) return false;
  const header = req.header("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return timingSafeEqualStrings(match[1], config.adminApiToken);
}

app.get("/health/detailed", async (req: Request, res: Response) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(404).json({ status: "not_found" });
  }
  try {
    const balance = await getRelayerBalance();
    const remainingBudget = getRemainingBudget();
    const budgetAvailable = checkDailyBudget();

    res.json({
      status: budgetAvailable ? "healthy" : "degraded",
      relayerBalance: balance,
      chainId: config.chainId,
      dailyBudget: {
        remaining: remainingBudget.toString(),
        available: budgetAvailable,
      },
    });
  } catch (error: unknown) {
    const sanitized = sanitizeError(error, "health");
    res.status(500).json({
      status: "unhealthy",
      error: sanitized.message,
    });
  }
});

// Only start the HTTP server when this module is run directly. When
// imported (e.g. by supertest in the test suite) we expose the Express
// app via the named export below without binding to a port.
if (require.main === module) {
  runStartupChecks()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Relayer server running on port ${PORT}`);
        console.log(`📡 RPC URL: ${config.rpcUrl}`);
        console.log(`🔗 Forwarder address: ${config.forwarderAddress}`);
        console.log(`🎯 Allowed targets: ${config.allowedTargets.join(", ") || "none (relayer will reject all requests)"}`);
        console.log(`🌐 Allowed origins: ${config.allowedOrigins.join(", ") || "none (CORS disabled)"}`);
      });
    })
    .catch((error) => {
      console.error("❌ Startup checks failed:", error);
      process.exit(1);
    });
}

export { app };

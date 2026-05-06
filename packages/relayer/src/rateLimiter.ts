import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";

// Rate limiting configuration from environment variables.
//
// Hard-fail at startup on malformed values. Without these guards,
// `RATE_LIMIT_PER_IP_PER_MIN=abc` parses to NaN, which express-rate-limit
// interprets as 0 and SILENTLY DISABLES the limit — turning a
// security-critical control off without any log line. Same hazard for
// the daily budget (parseFloat("abc") -> NaN -> all comparisons false ->
// budget never tripped).
function parsePositiveIntEnv(name: string, fallback: string): number {
  const raw = process.env[name] ?? fallback;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `CONFIG ERROR: ${name}="${raw}" is not a positive integer. ` +
        `Set ${name} to a positive integer (e.g. ${fallback}) or unset it to use the default.`,
    );
  }
  return parsed;
}

function parsePositiveFloatEnv(name: string, fallback: string): number {
  const raw = process.env[name] ?? fallback;
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `CONFIG ERROR: ${name}="${raw}" is not a positive number. ` +
        `Set ${name} to a positive number (e.g. ${fallback}) or unset it to use the default.`,
    );
  }
  return parsed;
}

const RATE_LIMIT_PER_IP_PER_MIN = parsePositiveIntEnv("RATE_LIMIT_PER_IP_PER_MIN", "20");
const RATE_LIMIT_PER_IP_PER_HOUR = parsePositiveIntEnv("RATE_LIMIT_PER_IP_PER_HOUR", "100");
const RATE_LIMIT_PER_ADDRESS_PER_MIN = parsePositiveIntEnv("RATE_LIMIT_PER_ADDRESS_PER_MIN", "10");
const RATE_LIMIT_PER_ADDRESS_PER_HOUR = parsePositiveIntEnv("RATE_LIMIT_PER_ADDRESS_PER_HOUR", "50");
const RATE_LIMIT_GLOBAL_CONCURRENT = parsePositiveIntEnv("RATE_LIMIT_GLOBAL_CONCURRENT", "100");
const DAILY_BUDGET_RBTC = parsePositiveFloatEnv("DAILY_BUDGET_RBTC", "0.1");

// Track per-address request counts and timestamps
interface AddressRateLimitData {
  count: number;
  hourlyCount: number;
  lastRequest: number;
  minuteResetTime: number;
  hourlyResetTime: number;
}

const addressLimits = new Map<string, AddressRateLimitData>();

// Cleanup old entries to prevent memory leak
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const ENTRY_TTL = 24 * 60 * 60 * 1000; // 24 hours

function cleanupOldEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  for (const [address, data] of addressLimits.entries()) {
    // Remove entries that haven't been accessed for 24 hours
    if (now - data.lastRequest > ENTRY_TTL) {
      keysToDelete.push(address);
    }
  }
  
  keysToDelete.forEach(key => addressLimits.delete(key));

  if (keysToDelete.length > 0) {
    // Cleaned up old address rate limit entries
  }
}

// Start cleanup interval and store the ID for cleanup in test environments
const cleanupInterval = setInterval(cleanupOldEntries, CLEANUP_INTERVAL);

// Export a cleanup function for test teardown. In production, the interval
// is intentional and should run for the lifetime of the process. In tests,
// calling this prevents interval accumulation across test runs.
export function cleanup(): void {
  clearInterval(cleanupInterval);
}

// Daily budget tracking
interface BudgetTracker {
  totalGasSpent: bigint;
  resetTime: number;
}

const dailyBudget: BudgetTracker = {
  totalGasSpent: 0n,
  resetTime: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
};

// Maximum daily budget in wei (configurable RBTC amount)
const MAX_DAILY_BUDGET = BigInt(Math.floor(DAILY_BUDGET_RBTC * 1e18));

// Per-IP rate limiter: configurable requests per minute
export const ipRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: RATE_LIMIT_PER_IP_PER_MIN,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  // Burst allowance handled by express-rate-limit internally
});

// Per-IP hourly rate limiter
export const ipHourlyRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: RATE_LIMIT_PER_IP_PER_HOUR,
  message: "Hourly request limit exceeded, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-address rate limiting is split into two phases to prevent a
// grievance-DoS where an attacker submits invalid requests with a victim's
// address in the `from` field to exhaust their quota:
//
//   1. addressRateLimiter (middleware) — READ-ONLY pre-flight. Rejects if
//      the claimed `from` is already over its quota, but does NOT increment
//      counters. Safe to run on unverified input.
//   2. recordAddressUsage(address) — called from the route handler ONLY
//      AFTER on-chain signature verification succeeds. This is the only
//      path that advances counters, so they can only be moved by the true
//      signer of a valid request.

const COOLDOWN_MS = 1000; // 1 second between requests for the same address

interface LimitCheckResult {
  allowed: boolean;
  status?: number;
  error?: string;
}

function ensureAddressData(address: string, now: number): AddressRateLimitData {
  let data = addressLimits.get(address);
  if (!data) {
    data = {
      count: 0,
      hourlyCount: 0,
      lastRequest: 0,
      minuteResetTime: now + 60 * 1000,
      hourlyResetTime: now + 60 * 60 * 1000,
    };
    addressLimits.set(address, data);
  }
  // Reset windows if expired (safe to do on read; rolls over the empty bucket).
  if (now >= data.hourlyResetTime) {
    data.hourlyCount = 0;
    data.hourlyResetTime = now + 60 * 60 * 1000;
  }
  if (now >= data.minuteResetTime) {
    data.count = 0;
    data.minuteResetTime = now + 60 * 1000;
  }
  return data;
}

function checkAddressLimit(address: string, now: number): LimitCheckResult {
  const data = ensureAddressData(address, now);

  if (data.lastRequest > 0 && now - data.lastRequest < COOLDOWN_MS) {
    return {
      allowed: false,
      status: 429,
      error: "Rate limit exceeded: Please wait 1 second between requests",
    };
  }
  if (data.count >= RATE_LIMIT_PER_ADDRESS_PER_MIN) {
    return {
      allowed: false,
      status: 429,
      error: `Rate limit exceeded: Maximum ${RATE_LIMIT_PER_ADDRESS_PER_MIN} requests per minute per address`,
    };
  }
  if (data.hourlyCount >= RATE_LIMIT_PER_ADDRESS_PER_HOUR) {
    return {
      allowed: false,
      status: 429,
      error: `Rate limit exceeded: Maximum ${RATE_LIMIT_PER_ADDRESS_PER_HOUR} requests per hour per address`,
    };
  }
  return { allowed: true };
}

// Public: call AFTER signature verification succeeds. Increments counters
// for the verified signer. Returns false if the verified signer has, in the
// meantime, exceeded their limit (concurrent-request race).
export function recordAddressUsage(address: string): LimitCheckResult {
  const now = Date.now();
  const check = checkAddressLimit(address.toLowerCase(), now);
  if (!check.allowed) return check;

  const data = ensureAddressData(address.toLowerCase(), now);
  data.count++;
  data.hourlyCount++;
  data.lastRequest = now;
  return { allowed: true };
}

// Middleware: read-only pre-flight. Rejects requests whose claimed `from`
// is already over quota (cheap fail-fast) but does NOT mutate counters,
// so attackers cannot push a victim over quota with unverified requests.
export function addressRateLimiter(req: Request, res: Response, next: NextFunction) {
  const body = req.body as { request?: { from?: string }; requests?: Array<{ request?: { from?: string } }> } | undefined;
  const now = Date.now();

  // Single relay request structure: { request: { from, ... }, signature: ... }
  if (body?.request && typeof body.request.from === "string") {
    const result = checkAddressLimit(body.request.from.toLowerCase(), now);
    if (!result.allowed) {
      res.status(result.status || 429).json({ success: false, error: result.error });
      return;
    }
  }

  // Batch relay request structure: { requests: [{ request: { from, ... }, signature: ... }], refundReceiver? }
  if (body?.requests && Array.isArray(body.requests)) {
    for (const reqItem of body.requests) {
      if (reqItem?.request && typeof reqItem.request.from === "string") {
        const result = checkAddressLimit(reqItem.request.from.toLowerCase(), now);
        if (!result.allowed) {
          res.status(result.status || 429).json({ success: false, error: result.error });
          return;
        }
      }
    }
  }

  next();
}

// Global concurrent request limiter
let concurrentRequests = 0;
const MAX_CONCURRENT_REQUESTS = RATE_LIMIT_GLOBAL_CONCURRENT;

export function concurrentRequestLimiter(req: Request, res: Response, next: NextFunction) {
  if (concurrentRequests >= MAX_CONCURRENT_REQUESTS) {
    return res.status(503).json({
      success: false,
      error: "Service temporarily unavailable: Too many concurrent requests",
    });
  }

  concurrentRequests++;

  // Decrement on whichever lifecycle event arrives first:
  //   * 'finish' — response fully flushed to the client.
  //   * 'close'  — connection torn down (client abort, network drop,
  //                AbortController cancellation, proxy timeout) before
  //                'finish' fires. Without this branch, aborted requests
  //                permanently leak a counter slot, and a sustained abort
  //                storm would peg the limiter at MAX and serve permanent
  //                503s until process restart.
  // The `released` guard makes the decrement idempotent so the two events
  // (which CAN both fire — 'close' is emitted after 'finish' on a normal
  // response) only decrement once.
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    concurrentRequests--;
  };
  res.on("finish", release);
  res.on("close", release);

  next();
}

// Daily budget checker
export function checkDailyBudget(): boolean {
  const now = Date.now();

  // Reset budget if 24 hours have passed
  if (now >= dailyBudget.resetTime) {
    dailyBudget.totalGasSpent = 0n;
    dailyBudget.resetTime = now + 24 * 60 * 60 * 1000;
  }

  return dailyBudget.totalGasSpent < MAX_DAILY_BUDGET;
}

// Track gas spent
export function trackGasSpent(gasUsed: bigint, gasPrice: bigint) {
  const gasCost = gasUsed * gasPrice;
  dailyBudget.totalGasSpent += gasCost;
}

// Get remaining budget
export function getRemainingBudget(): bigint {
  if (dailyBudget.totalGasSpent >= MAX_DAILY_BUDGET) {
    return 0n;
  }
  return MAX_DAILY_BUDGET - dailyBudget.totalGasSpent;
}

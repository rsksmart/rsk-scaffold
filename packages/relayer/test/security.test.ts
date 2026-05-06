// Real integration tests for the relayer's HTTP security fixes. These
// exercise the actual Express app via supertest rather than asserting on
// hand-rolled mocks. They cover only behaviors that can be observed at the
// HTTP boundary without hitting an RPC node — chain-dependent paths
// (signature verification, executeMetaTransaction) are out of scope here
// and should be covered by separate end-to-end tests against a fork.

import { expect } from "chai";
import request from "supertest";
import type { Express } from "express";

// Load app with a fully-specified env so config-time guards pass without
// requiring a real deployment. Must run before the first import of the app.
function loadAppWithEnv(env: Record<string, string | undefined>): Express {
  const original = { ...process.env };
  // Reset to a known baseline so previous test envs don't leak across files.
  process.env = { ...original };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }

  // Drop cached modules so config + index re-evaluate against the new env.
  delete require.cache[require.resolve("../src/config")];
  delete require.cache[require.resolve("../src/index")];
  delete require.cache[require.resolve("../src/relayer")];
  delete require.cache[require.resolve("../src/rateLimiter")];

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("../src/index") as { app: Express };

  // Restore the env after import so other tests are not polluted.
  process.env = original;
  return mod.app;
}

// A throwaway 32-byte private key. viem requires a valid hex format to
// build a wallet client at startup, but we never sign or send anything on
// chain in these tests.
const DUMMY_PK = "0x" + "1".repeat(64);
const DUMMY_FORWARDER = "0x" + "1".repeat(40);
const DUMMY_TARGET = "0x" + "2".repeat(40);
const VALID_ADMIN_TOKEN = "a".repeat(48); // >= 32 chars

const baseEnv: Record<string, string> = {
  NODE_ENV: "development", // skip the CORS hard-fail
  RELAYER_PRIVATE_KEY: DUMMY_PK,
  FORWARDER_ADDRESS: DUMMY_FORWARDER,
  ALLOWED_TARGETS: DUMMY_TARGET,
  ALLOWED_ORIGINS: "https://allowed.example",
  ADMIN_API_TOKEN: VALID_ADMIN_TOKEN,
  RPC_URL: "http://localhost:0", // unused; never dialled in these tests
  CHAIN_ID: "31",
};

describe("Relayer HTTP security (supertest)", function () {
  this.timeout(10_000);

  describe("S-MED-7 — security headers + X-Powered-By", function () {
    let app: Express;
    before(() => { app = loadAppWithEnv(baseEnv); });

    it("does not advertise the X-Powered-By header", async function () {
      const res = await request(app).get("/health");
      expect(res.headers["x-powered-by"]).to.be.undefined;
    });

    it("sets helmet's standard hardening headers", async function () {
      const res = await request(app).get("/health");
      // helmet defaults
      expect(res.headers["x-content-type-options"]).to.equal("nosniff");
      expect(res.headers["x-frame-options"]).to.match(/DENY|SAMEORIGIN/i);
      expect(res.headers).to.have.property("strict-transport-security");
      expect(res.headers).to.have.property("content-security-policy");
    });
  });

  describe("S-MED-4 — /health vs /health/detailed", function () {
    let app: Express;
    before(() => { app = loadAppWithEnv(baseEnv); });

    it("public /health returns only a status enum (no balance/budget)", async function () {
      const res = await request(app).get("/health");
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("status");
      expect(res.body).to.not.have.property("relayerBalance");
      expect(res.body).to.not.have.property("dailyBudget");
      expect(res.body).to.not.have.property("chainId");
    });

    it("/health/detailed without auth returns 404 (does not advertise endpoint)", async function () {
      // supertest connects via 127.0.0.1 — loopback would normally bypass
      // auth, so we re-load the app with DISABLE_LOOPBACK_AUTH=true.
      const lockedApp = loadAppWithEnv({ ...baseEnv, DISABLE_LOOPBACK_AUTH: "true" });
      const res = await request(lockedApp)
        .get("/health/detailed")
        .set("Accept", "application/json");
      expect(res.status).to.equal(404);
      expect(res.body).to.deep.equal({ status: "not_found" });
    });

    it("/health/detailed with a wrong bearer token returns 404", async function () {
      const lockedApp = loadAppWithEnv({ ...baseEnv, DISABLE_LOOPBACK_AUTH: "true" });
      const res = await request(lockedApp)
        .get("/health/detailed")
        .set("Authorization", `Bearer ${"b".repeat(48)}`);
      expect(res.status).to.equal(404);
    });

    it("/health/detailed with the correct bearer token returns the privileged payload", async function () {
      const lockedApp = loadAppWithEnv({ ...baseEnv, DISABLE_LOOPBACK_AUTH: "true" });
      const res = await request(lockedApp)
        .get("/health/detailed")
        .set("Authorization", `Bearer ${VALID_ADMIN_TOKEN}`);
      // Note: the handler reads the on-chain balance which is unreachable
      // here, so we accept either 200 (if it short-circuits) or 500 (if the
      // RPC call throws), and only assert the auth gate let us through.
      expect(res.status).to.be.oneOf([200, 500]);
      if (res.status === 200) {
        expect(res.body).to.have.property("relayerBalance");
        expect(res.body).to.have.property("dailyBudget");
      }
    });
  });

  describe("S-MED-6 — /nonce/:address input validation", function () {
    let app: Express;
    before(() => { app = loadAppWithEnv(baseEnv); });

    it("rejects malformed addresses with 400 before any RPC call", async function () {
      const res = await request(app).get("/nonce/notanaddress");
      expect(res.status).to.equal(400);
      expect(res.body.error).to.match(/invalid address/i);
    });

    it("rejects too-short hex strings with 400", async function () {
      const res = await request(app).get("/nonce/0xabc");
      expect(res.status).to.equal(400);
    });
  });

  describe("S-HIGH-3 — refundReceiver rejection in /relay/batch", function () {
    let app: Express;
    before(() => { app = loadAppWithEnv(baseEnv); });

    const minimalBatchRequest = (overrides: Record<string, unknown> = {}) => ({
      requests: [
        {
          request: {
            from: "0x" + "3".repeat(40),
            to: DUMMY_TARGET,
            value: "0",
            gas: "100000",
            deadline: (Math.floor(Date.now() / 1000) + 3600).toString(),
            data: "0x",
          },
          signature: "0x" + "a".repeat(130),
        },
      ],
      ...overrides,
    });

    it("rejects a non-zero refundReceiver with 400", async function () {
      const body = minimalBatchRequest({
        refundReceiver: "0x" + "9".repeat(40),
      });
      const res = await request(app).post("/relay/batch").send(body);
      expect(res.status).to.equal(400);
      expect(res.body.success).to.equal(false);
      expect(res.body.error).to.match(/refundReceiver|atomic/i);
    });

    it("accepts an explicit zero refundReceiver (request proceeds past this gate)", async function () {
      // Subsequent stages (validation/verification) will fail because the
      // signature is fake, but the refundReceiver gate must NOT be the
      // reason for rejection. We assert the error message does not mention
      // refundReceiver.
      const body = minimalBatchRequest({
        refundReceiver: "0x0000000000000000000000000000000000000000",
      });
      const res = await request(app).post("/relay/batch").send(body);
      expect(res.status).to.be.oneOf([400, 503]);
      if (res.body && typeof res.body.error === "string") {
        expect(res.body.error).to.not.match(/refundReceiver/i);
      }
    });

    it("rejects empty batches with 400", async function () {
      const res = await request(app).post("/relay/batch").send({ requests: [] });
      expect(res.status).to.equal(400);
      expect(res.body.error).to.match(/at least one/i);
    });

    it("rejects oversized batches with 400", async function () {
      const oversized = {
        requests: Array.from({ length: 11 }, () => ({
          request: {
            from: "0x" + "3".repeat(40),
            to: DUMMY_TARGET,
            value: "0",
            gas: "100000",
            deadline: (Math.floor(Date.now() / 1000) + 3600).toString(),
            data: "0x",
          },
          signature: "0x" + "a".repeat(130),
        })),
      };
      const res = await request(app).post("/relay/batch").send(oversized);
      expect(res.status).to.equal(400);
      expect(res.body.error).to.match(/limited to 10/i);
    });
  });

  describe("S-HIGH-1 — CORS allowlist enforcement", function () {
    let app: Express;
    before(() => { app = loadAppWithEnv(baseEnv); });

    it("echoes Access-Control-Allow-Origin only for allowlisted origins", async function () {
      const res = await request(app)
        .options("/relay")
        .set("Origin", "https://allowed.example")
        .set("Access-Control-Request-Method", "POST");
      expect(res.headers["access-control-allow-origin"]).to.equal("https://allowed.example");
    });

    it("does NOT echo ACAO for non-allowlisted origins", async function () {
      const res = await request(app)
        .options("/relay")
        .set("Origin", "https://evil.example")
        .set("Access-Control-Request-Method", "POST");
      expect(res.headers["access-control-allow-origin"]).to.not.equal("https://evil.example");
      expect(res.headers["access-control-allow-origin"]).to.not.equal("*");
    });

    it("never combines credentials:true with a wildcard origin", async function () {
      // With an allowlist configured, credentials may be true but origin
      // must be the specific echoed origin, never '*'.
      const res = await request(app)
        .options("/relay")
        .set("Origin", "https://allowed.example")
        .set("Access-Control-Request-Method", "POST");
      const acao = res.headers["access-control-allow-origin"];
      const acac = res.headers["access-control-allow-credentials"];
      if (acac === "true") {
        expect(acao).to.not.equal("*");
      }
    });
  });

  describe("S-HIGH-1 — CORS hard-fail when no allowlist in production", function () {
    it("throws at app load when ALLOWED_ORIGINS is empty and NODE_ENV=production", function () {
      const env = { ...baseEnv, NODE_ENV: "production", ALLOWED_ORIGINS: "" };
      expect(() => loadAppWithEnv(env)).to.throw(/ALLOWED_ORIGINS/);
    });

    it("does NOT throw when ALLOWED_ORIGINS is empty and NODE_ENV=development", function () {
      const env = { ...baseEnv, NODE_ENV: "development", ALLOWED_ORIGINS: "" };
      expect(() => loadAppWithEnv(env)).to.not.throw();
    });
  });
});

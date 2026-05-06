import { expect } from "chai";
import { ForwardRequest } from "../src/types";

// Mock environment variables for testing.
//
// validator.ts captures `config` at module load via a top-level import,
// so static-importing `validateRelayRequest` here would freeze it against
// whatever config was active when this test file was first evaluated.
// The validator-test blocks below therefore (1) clear BOTH the config and
// validator caches in beforeEach, and (2) use dynamic require() to pick up
// the freshly bound `config` reference each test.
const originalEnv = process.env;

function resetConfigAndValidatorCache() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  delete require.cache[require.resolve("../src/config")];
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  delete require.cache[require.resolve("../src/validator")];
}

describe("Target Allowlist Configuration", function () {
  beforeEach(function () {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    delete process.env.EXAMPLE_TARGET_ADDRESS;
    delete process.env.ALLOWED_TARGETS;
    
    // Clear module cache to ensure config is re-read with new environment
    delete require.cache[require.resolve("../src/config")];
  });

  afterEach(function () {
    // Restore original environment
    process.env = originalEnv;
    
    // Clear module cache after test
    delete require.cache[require.resolve("../src/config")];
  });

  it("should parse single target from EXAMPLE_TARGET_ADDRESS", function () {
    process.env.EXAMPLE_TARGET_ADDRESS = "0x1234567890123456789012345678901234567890";
    
    // Import config dynamically to get fresh environment values
    const { config } = require("../src/config");
    
    expect(config.allowedTargets).to.have.length(1);
    expect(config.allowedTargets[0]).to.equal("0x1234567890123456789012345678901234567890");
  });

  it("should parse multiple targets from ALLOWED_TARGETS", function () {
    process.env.ALLOWED_TARGETS = "0x1111111111111111111111111111111111111111,0x2222222222222222222222222222222222222222,0x3333333333333333333333333333333333333333";
    
    const { config } = require("../src/config");
    
    expect(config.allowedTargets).to.have.length(3);
    expect(config.allowedTargets).to.include("0x1111111111111111111111111111111111111111");
    expect(config.allowedTargets).to.include("0x2222222222222222222222222222222222222222");
    expect(config.allowedTargets).to.include("0x3333333333333333333333333333333333333333");
  });

  it("should prioritize ALLOWED_TARGETS over EXAMPLE_TARGET_ADDRESS", function () {
    process.env.EXAMPLE_TARGET_ADDRESS = "0x9999999999999999999999999999999999999999";
    process.env.ALLOWED_TARGETS = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA,0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
    
    const { config } = require("../src/config");
    
    expect(config.allowedTargets).to.have.length(2);
    expect(config.allowedTargets).to.not.include("0x9999999999999999999999999999999999999999");
    expect(config.allowedTargets).to.include("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(config.allowedTargets).to.include("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  });

  it("should handle whitespace correctly", function () {
    process.env.ALLOWED_TARGETS = " 0x1111111111111111111111111111111111111111 , 0x2222222222222222222222222222222222222222 ";
    
    const { config } = require("../src/config");
    
    expect(config.allowedTargets).to.have.length(2);
    expect(config.allowedTargets[0]).to.equal("0x1111111111111111111111111111111111111111");
    expect(config.allowedTargets[1]).to.equal("0x2222222222222222222222222222222222222222");
  });

  it("should convert addresses to lowercase", function () {
    process.env.ALLOWED_TARGETS = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
    
    const { config } = require("../src/config");
    
    expect(config.allowedTargets).to.have.length(1);
    expect(config.allowedTargets[0]).to.equal("0xabcdef1234567890abcdef1234567890abcdef12");
  });

  it("should filter empty entries", function () {
    process.env.ALLOWED_TARGETS = "0x1111111111111111111111111111111111111111,,0x2222222222222222222222222222222222222222,  ,";
    
    const { config } = require("../src/config");
    
    expect(config.allowedTargets).to.have.length(2);
    expect(config.allowedTargets).to.include("0x1111111111111111111111111111111111111111");
    expect(config.allowedTargets).to.include("0x2222222222222222222222222222222222222222");
  });

  it("should return empty array when no targets configured", function () {
    const { config } = require("../src/config");
    
    expect(config.allowedTargets).to.have.length(0);
  });
});

describe("Target Allowlist Validation", function () {
  beforeEach(function () {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    delete process.env.EXAMPLE_TARGET_ADDRESS;
    delete process.env.ALLOWED_TARGETS;

    // Clear BOTH config and validator caches so the validator picks up
    // the freshly loaded config rather than a stale captured reference.
    resetConfigAndValidatorCache();
  });

  afterEach(function () {
    process.env = originalEnv;
    resetConfigAndValidatorCache();
  });

  const createTestRequest = (to: string): ForwardRequest => ({
    from: "0x1234567890123456789012345678901234567890",
    to,
    value: "0",
    gas: "100000",
    deadline: (Math.floor(Date.now() / 1000) + 3600).toString(),
    data: "0x1234",
  });

  const testSignature = "0x" + "a".repeat(130);

  // Dynamic import so each test gets a validator bound to the freshly
  // loaded config module (after the beforeEach cache reset).
  function loadValidator(): typeof import("../src/validator").validateRelayRequest {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../src/validator").validateRelayRequest;
  }

  it("should accept requests to allowed targets", function () {
    process.env.ALLOWED_TARGETS =
      "0x1111111111111111111111111111111111111111,0x2222222222222222222222222222222222222222";

    const validateRelayRequest = loadValidator();
    const request = createTestRequest("0x1111111111111111111111111111111111111111");
    const result = validateRelayRequest(request, testSignature);

    expect(result.valid).to.be.true;
  });

  it("should reject requests to non-allowed targets", function () {
    process.env.ALLOWED_TARGETS =
      "0x1111111111111111111111111111111111111111,0x2222222222222222222222222222222222222222";

    const validateRelayRequest = loadValidator();
    const request = createTestRequest("0x9999999999999999999999999999999999999999");
    const result = validateRelayRequest(request, testSignature);

    expect(result.valid).to.be.false;
    expect(result.error).to.equal("Target contract not allowed");
  });

  it("should perform case-insensitive matching", function () {
    process.env.ALLOWED_TARGETS = "0xabcdef1234567890abcdef1234567890abcdef12";

    const validateRelayRequest = loadValidator();
    const request = createTestRequest("0xABCDEF1234567890ABCDEF1234567890ABCDEF12"); // Uppercase
    const result = validateRelayRequest(request, testSignature);

    expect(result.valid).to.be.true;
  });

  // Documents the explicit fail-closed decision (B-MED-14): an empty
  // allowlist must reject every request, never accept-by-default. The
  // previous "backward compatibility" test asserted the opposite and was
  // only passing in the contributor's environment due to module-load
  // config caching reading stale state.
  it("fails closed when no targets are configured (rejects all requests)", function () {
    // No ALLOWED_TARGETS or EXAMPLE_TARGET_ADDRESS set
    const validateRelayRequest = loadValidator();
    const request = createTestRequest("0x9999999999999999999999999999999999999999");
    const result = validateRelayRequest(request, testSignature);

    expect(result.valid).to.be.false;
    expect(result.error).to.equal("Target contract not allowed");
  });
});

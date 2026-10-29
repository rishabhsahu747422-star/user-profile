process.env.JWT_SECRET = process.env.JWT_SECRET || "production_readiness_test_jwt_secret_32_characters_long_min";
process.env.CLIENT_URL = "http://localhost:5173,https://veloop-rewards.example.com";

import http from "http";
import mongoose from "mongoose";
import User from "./src/models/User.js";
import Wallet from "./src/models/Wallet.js";
import WalletTransaction from "./src/models/WalletTransaction.js";
import Withdrawal from "./src/models/Withdrawal.js";
import { validateEnv } from "./src/config/env.js";
import {
  isTransactionSupported,
  executeCredit,
  executeDebit,
  holdBalance,
  releaseHold,
  settleHold,
  reconcileWallet
} from "./src/services/wallet.service.js";
import { createWithdrawalRequest } from "./src/services/withdrawal.service.js";
import app from "./src/app.js";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/user-profile";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });
    req.on("error", reject);
    if (data) {
      req.write(typeof data === "string" ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== Starting Milestone 7: Production Deployment Readiness & Observability Tests ===\n");

  await mongoose.connect(MONGO_URI);
  const server = app.listen(0);
  const port = server.address().port;

  try {
    // -------------------------------------------------------------
    // 1. Environment Configuration Validation
    // -------------------------------------------------------------
    console.log("--- 1. Testing Environment Validation & Fail-Fast Guard ---");
    const validConfig = validateEnv();
    assert(typeof validConfig.PORT === "number", "Valid configuration parses integer PORT");
    assert(Boolean(validConfig.JWT_SECRET), "Valid configuration contains JWT_SECRET");
    assert(validConfig.NODE_ENV !== undefined, "Configuration identifies runtime NODE_ENV");

    // Test fail-fast on invalid PORT
    let portValidationFailed = false;
    const originalPort = process.env.PORT;
    try {
      process.env.PORT = "not_a_valid_port";
      validateEnv();
    } catch {
      portValidationFailed = true;
    } finally {
      process.env.PORT = originalPort;
    }
    assert(portValidationFailed, "validateEnv() fails fast on invalid non-numeric PORT");

    // Test fail-fast on missing JWT_SECRET in production
    let secretValidationFailed = false;
    const originalSecret = process.env.JWT_SECRET;
    const originalNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "too_short"; // less than 32 chars
      validateEnv();
    } catch {
      secretValidationFailed = true;
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      process.env.JWT_SECRET = originalSecret;
    }
    assert(secretValidationFailed, "validateEnv() fails fast in production if JWT_SECRET < 32 characters");

    // -------------------------------------------------------------
    // 2. Health (Liveness) & Readiness Probes
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing Liveness (/health) & Readiness (/ready) Endpoints ---");

    // Liveness Probe on root: GET /health
    const rootHealthRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/health",
      method: "GET"
    });
    assert(rootHealthRes.status === 200, "Root GET /health returns HTTP 200");
    assert(rootHealthRes.data.status === "ok", "Liveness probe reports status 'ok'");
    assert(typeof rootHealthRes.data.uptime === "number", "Liveness probe reports process uptime in seconds");
    assert(rootHealthRes.data.database && rootHealthRes.data.database.connected === true, "Liveness probe verifies database connectivity");
    assert(rootHealthRes.data.database.uri === undefined, "Security rule: Connection string is NOT leaked in health response");

    // Liveness Probe on API path: GET /api/health
    const apiHealthRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/health",
      method: "GET"
    });
    assert(apiHealthRes.status === 200, "API path GET /api/health returns HTTP 200");

    // Readiness Probe on root: GET /ready
    const rootReadyRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/ready",
      method: "GET"
    });
    assert(rootReadyRes.status === 200, "Root GET /ready returns HTTP 200");
    assert(rootReadyRes.data.ready === true, "Readiness probe reports ready: true");
    assert(rootReadyRes.data.dependencies.database.status === "connected", "Readiness confirms database dependency is 'connected'");

    // Readiness Probe on API path: GET /api/ready
    const apiReadyRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/ready",
      method: "GET"
    });
    assert(apiReadyRes.status === 200, "API path GET /api/ready returns HTTP 200");

    // -------------------------------------------------------------
    // 3. Structured Request Logging & Correlation Tracing
    // -------------------------------------------------------------
    console.log("\n--- 3. Testing Request Logging & Correlation ID (X-Request-Id) ---");

    // Server generates a random X-Request-Id when client does not supply one
    const generatedTraceRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/health",
      method: "GET"
    });
    assert(Boolean(generatedTraceRes.headers["x-request-id"]), "Response includes X-Request-Id header");

    // Server preserves and forwards client's incoming X-Request-Id
    const incomingTraceId = "client-trace-id-abc-123-xyz";
    const forwardedTraceRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/health",
      method: "GET",
      headers: { "X-Request-Id": incomingTraceId }
    });
    assert(forwardedTraceRes.headers["x-request-id"] === incomingTraceId, "Server preserves and mirrors incoming X-Request-Id");

    // -------------------------------------------------------------
    // 4. Standalone MongoDB Compensating-Ledger Concurrency & Recovery
    // -------------------------------------------------------------
    console.log("\n--- 4. Testing Compensating-Ledger Concurrency, Idempotency & Reconciliation ---");

    const isTx = isTransactionSupported();
    console.log(`[INFO] Current Active MongoDB Topology Transaction Support: ${isTx} (isTransactionSupported: ${isTx})`);

    const user = await User.create({
      name: "Financial Recovery Tester",
      email: `fin_recovery_${Date.now()}@example.com`,
      password: "FinPassword123!",
      role: "user",
      status: "active"
    });

    // Step A: Fund wallet with 700 VEs
    const creditRes = await executeCredit({
      userId: user._id,
      assetType: "VE",
      amount: 700,
      reason: "Initial funding for concurrency test",
      idempotencyKey: `fund_concurrency_${Date.now()}`
    });
    assert(!creditRes.isDuplicate, "Initial credit executed as new transaction");

    // Step B: Idempotent Credit Retry
    const duplicateCredit = await executeCredit({
      userId: user._id,
      assetType: "VE",
      amount: 700,
      reason: "Initial funding retry",
      idempotencyKey: creditRes.transaction.idempotencyKey
    });
    assert(duplicateCredit.isDuplicate === true, "Duplicate credit request recognized as duplicate");
    assert(duplicateCredit.transaction._id.toString() === creditRes.transaction._id.toString(), "Returns original transaction record");

    const walletAfterCredit = await Wallet.findOne({ userId: user._id });
    assert(walletAfterCredit.balances.VE.available === 700, "Wallet balance NOT doubled on retried credit (remains 700 VEs)");

    // Step C: High Concurrency Stress Test on Debits
    // 5 simultaneous debit operations of 300 VEs against an available balance of 700 VEs.
    // Mathematical guarantee: Exactly 2 debits must succeed (2 * 300 = 600), and 3 must fail.
    // Available balance must never drop below 0.
    const debitPromises = [1, 2, 3, 4, 5].map((i) =>
      executeDebit({
        userId: user._id,
        assetType: "VE",
        amount: 300,
        reason: `Concurrent debit attempt #${i}`,
        idempotencyKey: `concurrent_debit_${i}_${Date.now()}`
      }).catch((err) => ({ error: err.message }))
    );

    const debitResults = await Promise.all(debitPromises);
    const successfulDebits = debitResults.filter((r) => !r.error);
    const rejectedDebits = debitResults.filter((r) => r.error);

    assert(successfulDebits.length === 2, `Exactly 2 out of 5 debits succeeded (Result: ${successfulDebits.length} succeeded)`);
    assert(rejectedDebits.length === 3, `Exactly 3 debits rejected for insufficient balance (Result: ${rejectedDebits.length} rejected)`);

    const walletAfterDebits = await Wallet.findOne({ userId: user._id });
    assert(walletAfterDebits.balances.VE.available === 100, "Final available balance is exactly 100 VEs (700 - 600, never negative)");

    // Step D: Hold and Release Integrity
    const holdRes = await holdBalance({
      userId: user._id,
      assetType: "VE",
      amount: 100,
      reason: "Test hold for withdrawal",
      idempotencyKey: `test_hold_${Date.now()}`
    });
    assert(holdRes.transaction && holdRes.transaction.type === "HOLD", "Hold transaction recorded in ledger");
    const walletAfterHold = await Wallet.findOne({ userId: user._id });
    assert(walletAfterHold.balances.VE.available === 0, "Hold reduced available balance to 0");
    assert(walletAfterHold.balances.VE.reserved === 100, "Hold increased reserved balance to 100");

    // Attempt overdraft hold -> Must fail
    let overdraftHoldBlocked = false;
    try {
      await holdBalance({
        userId: user._id,
        assetType: "VE",
        amount: 50,
        reason: "Overdraft hold attempt",
        idempotencyKey: `overdraft_hold_${Date.now()}`
      });
    } catch {
      overdraftHoldBlocked = true;
    }
    assert(overdraftHoldBlocked, "Overdraft hold request safely blocked for insufficient balance");

    // Release the hold
    const releaseRes = await releaseHold({
      userId: user._id,
      assetType: "VE",
      amount: 100,
      reason: "Release test hold",
      idempotencyKey: `test_release_${Date.now()}`
    });
    assert(releaseRes.transaction && releaseRes.transaction.type === "RELEASE", "Release transaction recorded in ledger");
    const walletAfterRelease = await Wallet.findOne({ userId: user._id });
    assert(walletAfterRelease.balances.VE.available === 100, "Release restored available balance to 100");
    assert(walletAfterRelease.balances.VE.reserved === 0, "Release cleared reserved balance to 0");

    // Step E: Full Ledger Reconciliation
    const reconciliation = await reconcileWallet(user._id);
    assert(reconciliation.isReconciled === true, "Full wallet-to-ledger reconciliation reports 100% agreement");
    assert(reconciliation.discrepancies.length === 0, "Zero ledger reconciliation discrepancies found");

    // Clean up test data
    await User.deleteOne({ _id: user._id });
    await Wallet.deleteOne({ userId: user._id });
    console.log("[PASS] Test fixtures cleaned up");

  } catch (err) {
    console.error("Test execution failed:", err);
    failed++;
  } finally {
    server.close();
    await mongoose.disconnect();
    console.log("\n=== Test Summary ===");
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

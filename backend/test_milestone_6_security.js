process.env.JWT_SECRET = process.env.JWT_SECRET || "milestone_6_security_test_secret_key_998877";

import http from "http";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "./src/models/User.js";
import Wallet from "./src/models/Wallet.js";
import Withdrawal from "./src/models/Withdrawal.js";
import AdminAuditLog from "./src/models/AdminAuditLog.js";
import { executeCredit } from "./src/services/wallet.service.js";
import { createWithdrawalRequest } from "./src/services/withdrawal.service.js";
import { generateToken } from "./src/utils/jwt.js";
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
  console.log("=== Starting Milestone 6: Security Hardening & Integrity Audit Tests ===\n");

  await mongoose.connect(MONGO_URI);
  const server = app.listen(0);
  const port = server.address().port;

  try {
    // -------------------------------------------------------------
    // Setup Test Principals
    // -------------------------------------------------------------
    const adminUser = await User.create({
      name: "Security Admin",
      email: `sec_admin_${Date.now()}@example.com`,
      password: "AdminPassword123!",
      role: "admin",
      status: "active"
    });

    const userA = await User.create({
      name: "Alice User",
      email: `alice_${Date.now()}@example.com`,
      password: "AlicePassword123!",
      role: "user",
      status: "active"
    });

    const userB = await User.create({
      name: "Bob User",
      email: `bob_${Date.now()}@example.com`,
      password: "BobPassword123!",
      role: "user",
      status: "active"
    });

    const suspendedUser = await User.create({
      name: "Suspended User",
      email: `suspended_${Date.now()}@example.com`,
      password: "SuspendedPassword123!",
      role: "user",
      status: "suspended"
    });

    const adminToken = generateToken({ id: adminUser._id, role: adminUser.role });
    const userAToken = generateToken({ id: userA._id, role: userA.role });
    const userBToken = generateToken({ id: userB._id, role: userB.role });
    const suspendedToken = generateToken({ id: suspendedUser._id, role: suspendedUser.role });

    // -------------------------------------------------------------
    // 1. HTTP Security Headers & Fingerprinting
    // -------------------------------------------------------------
    console.log("--- 1. Testing HTTP Security Headers & Fingerprinting ---");
    const healthRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/health",
      method: "GET"
    });
    assert(healthRes.headers["x-content-type-options"] === "nosniff", "X-Content-Type-Options: nosniff header present");
    assert(healthRes.headers["x-frame-options"] === "DENY", "X-Frame-Options: DENY header present");
    assert(healthRes.headers["x-powered-by"] === undefined, "X-Powered-By header is strictly disabled");
    assert(healthRes.headers["referrer-policy"] === "strict-origin-when-cross-origin", "Referrer-Policy header present");

    // -------------------------------------------------------------
    // 2. Authentication & JWT Validation Tests
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing Authentication & JWT Validation ---");

    // Missing token
    const noTokenRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/profile",
      method: "GET"
    });
    assert(noTokenRes.status === 401, "Missing token rejected with HTTP 401");

    // Malformed token
    const malformedRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/profile",
      method: "GET",
      headers: { Authorization: "Bearer this.is.invalid.jwt" }
    });
    assert(malformedRes.status === 401, "Malformed token rejected with HTTP 401");

    // Expired token
    const expiredToken = jwt.sign(
      { id: userA._id, role: userA.role },
      process.env.JWT_SECRET,
      { expiresIn: "-1s" }
    );
    const expiredRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/profile",
      method: "GET",
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert(expiredRes.status === 401, "Expired token rejected with HTTP 401");

    // Forged signature
    const forgedToken = jwt.sign(
      { id: userA._id, role: "admin" },
      "wrong_secret_attacker_key_xyz",
      { expiresIn: "1h" }
    );
    const forgedRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/admin/overview",
      method: "GET",
      headers: { Authorization: `Bearer ${forgedToken}` }
    });
    assert(forgedRes.status === 401, "Forged signature token rejected with HTTP 401");

    // None algorithm attack simulation
    const noneAlgorithmToken = jwt.sign(
      { id: userA._id, role: "admin" },
      "",
      { algorithm: "none" }
    );
    const noneAlgRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/admin/overview",
      method: "GET",
      headers: { Authorization: `Bearer ${noneAlgorithmToken}` }
    });
    assert(noneAlgRes.status === 401, "Token with 'none' algorithm rejected with HTTP 401");

    // Non-ObjectId in JWT payload
    const invalidIdToken = jwt.sign(
      { id: "non_object_id_string_injection", role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const invalidIdRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/profile",
      method: "GET",
      headers: { Authorization: `Bearer ${invalidIdToken}` }
    });
    assert(invalidIdRes.status === 401, "Token with invalid ObjectId format rejected with HTTP 401");

    // -------------------------------------------------------------
    // 3. Suspended & Inactive Account Enforcement
    // -------------------------------------------------------------
    console.log("\n--- 3. Testing Suspended & Inactive Account Enforcement ---");
    const suspOverviewRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/overview",
      method: "GET",
      headers: { Authorization: `Bearer ${suspendedToken}` }
    });
    assert(suspOverviewRes.status === 403, "Suspended account accessing /overview rejected with HTTP 403");

    const suspProfileRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/profile",
      method: "GET",
      headers: { Authorization: `Bearer ${suspendedToken}` }
    });
    assert(suspProfileRes.status === 403, "Suspended account accessing /profile rejected with HTTP 403");

    // -------------------------------------------------------------
    // 4. RBAC & Privilege Escalation Prevention
    // -------------------------------------------------------------
    console.log("\n--- 4. Testing RBAC & Privilege Escalation Prevention ---");

    // Normal user accessing admin overview
    const normalAdminRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/admin/overview",
      method: "GET",
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    assert(normalAdminRes.status === 403, "Normal user accessing /admin/overview rejected with HTTP 403");

    // Registration with attempted role escalation
    const escRegisterRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/auth/register",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, {
      name: "Hacker User",
      email: `hacker_${Date.now()}@example.com`,
      password: "HackerPassword123!",
      role: "admin",
      status: "active"
    });
    assert(escRegisterRes.status === 201, "Registration succeeded");
    assert(escRegisterRes.data.user.role === "user", "Privilege escalation blocked: Role forced to 'user'");

    // Self-suspension prevention for admins
    const selfSuspendRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/admin/users/${adminUser._id}/status`,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      }
    }, { status: "suspended", reason: "Attempted self-suspension" });
    assert(selfSuspendRes.status === 400, "Admin cannot suspend their own account (HTTP 400)");

    // -------------------------------------------------------------
    // 5. NoSQL Injection & Input Type Validation
    // -------------------------------------------------------------
    console.log("\n--- 5. Testing NoSQL Query Injection & Input Type Validation ---");

    // Login with operator object payload instead of string
    const injectLoginRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, {
      email: { $ne: null },
      password: { $gt: "" }
    });
    assert(injectLoginRes.status === 400, "NoSQL operator injection in login rejected with HTTP 400");

    // Withdrawal creation with fractional amount
    const floatWithdrawalRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/withdrawals",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userAToken}`
      }
    }, {
      amount: 150.75,
      assetType: "VE",
      idempotencyKey: `float_test_${Date.now()}`
    });
    assert(floatWithdrawalRes.status === 400, "Fractional withdrawal amount (150.75) rejected with HTTP 400");

    // Withdrawal creation with negative amount
    const negWithdrawalRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/withdrawals",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userAToken}`
      }
    }, {
      amount: -100,
      assetType: "VE",
      idempotencyKey: `neg_test_${Date.now()}`
    });
    assert(negWithdrawalRes.status === 400, "Negative withdrawal amount rejected with HTTP 400");

    // Withdrawal creation with non-numeric string amount
    const strWithdrawalRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/withdrawals",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userAToken}`
      }
    }, {
      amount: "fifty",
      assetType: "VE",
      idempotencyKey: `str_test_${Date.now()}`
    });
    assert(strWithdrawalRes.status === 400, "Non-integer string withdrawal amount rejected with HTTP 400");

    // Malformed ObjectId in URL path
    const malformedIdRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/withdrawals/malformed-id-not-hex",
      method: "GET",
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    assert(malformedIdRes.status === 404, "Malformed withdrawal ID in URL rejected with HTTP 404");

    const malformedClaimRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/achievements/malformed-id/claim",
      method: "POST",
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    assert(malformedClaimRes.status === 400, "Malformed achievement ID in claim rejected with HTTP 400");

    // -------------------------------------------------------------
    // 6. IDOR (Horizontal Privilege Escalation) Protection
    // -------------------------------------------------------------
    console.log("\n--- 6. Testing IDOR & Cross-User Record Protection ---");

    // Fund User A and create a withdrawal
    await executeCredit({
      userId: userA._id,
      assetType: "VE",
      amount: 1000,
      reason: "Initial Alice credit",
      idempotencyKey: `fund_alice_${Date.now()}`
    });

    const { withdrawal: aliceWd } = await createWithdrawalRequest({
      userId: userA._id,
      assetType: "VE",
      amount: 300,
      idempotencyKey: `alice_wd_${Date.now()}`
    });

    // User B attempts to read User A's withdrawal
    const idorReadRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/users/me/withdrawals/${aliceWd._id}`,
      method: "GET",
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    assert(idorReadRes.status === 404, "User B cannot view User A's withdrawal (HTTP 404)");

    // User B attempts to cancel User A's withdrawal
    const idorCancelRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/users/me/withdrawals/${aliceWd._id}/cancel`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userBToken}`
      }
    }, { reason: "Malicious cancellation attempt" });
    assert(idorCancelRes.status === 400 || idorCancelRes.status === 404, "User B cannot cancel User A's withdrawal");

    // -------------------------------------------------------------
    // 7. Audit Log Immutability & Protection
    // -------------------------------------------------------------
    console.log("\n--- 7. Testing Audit Log Immutability & Modification Blocks ---");

    const auditEntry = await AdminAuditLog.create({
      adminId: adminUser._id,
      adminEmail: adminUser.email,
      adminRole: "admin",
      action: "USER_STATUS_CHANGE",
      targetType: "USER",
      targetId: userA._id.toString(),
      reason: "Compliance audit test record"
    });
    assert(Boolean(auditEntry), "Audit record successfully created");

    let updateBlocked = false;
    try {
      await AdminAuditLog.updateOne({ _id: auditEntry._id }, { reason: "Tampered Reason" });
    } catch (err) {
      if (err.message.includes("immutable")) {
        updateBlocked = true;
      }
    }
    assert(updateBlocked, "Direct update on AdminAuditLog blocked by immutability hook");

    let deleteBlocked = false;
    try {
      await AdminAuditLog.deleteOne({ _id: auditEntry._id });
    } catch (err) {
      if (err.message.includes("immutable")) {
        deleteBlocked = true;
      }
    }
    assert(deleteBlocked, "Direct delete on AdminAuditLog blocked by immutability hook");

    // -------------------------------------------------------------
    // 8. Undefined Route 404 Protection
    // -------------------------------------------------------------
    console.log("\n--- 8. Testing API 404 Catch-All ---");
    const notFoundRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/some_undefined_random_endpoint",
      method: "GET"
    });
    assert(notFoundRes.status === 404, "Undefined API endpoint returns HTTP 404");
    assert(notFoundRes.data.message === "API endpoint not found.", "Undefined endpoint returns standard JSON error message");

    // Cleanup
    await User.deleteMany({ _id: { $in: [adminUser._id, userA._id, userB._id, suspendedUser._id] } });
    await Wallet.deleteMany({ userId: { $in: [adminUser._id, userA._id, userB._id, suspendedUser._id] } });
    await Withdrawal.deleteMany({ userId: { $in: [userA._id, userB._id] } });
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


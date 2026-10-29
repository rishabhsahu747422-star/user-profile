process.env.JWT_SECRET = process.env.JWT_SECRET || "milestone_5_admin_test_jwt_secret_key_12345";

import http from "http";
import mongoose from "mongoose";
import User from "./src/models/User.js";
import Wallet from "./src/models/Wallet.js";
import UserProgress from "./src/models/UserProgress.js";
import Withdrawal from "./src/models/Withdrawal.js";
import AdminAuditLog from "./src/models/AdminAuditLog.js";
import { executeCredit } from "./src/services/wallet.service.js";
import { awardXp } from "./src/services/progression.service.js";
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
  console.log("=== Starting Milestone 5: Admin Management System & Dashboard Verification Tests ===\n");

  await mongoose.connect(MONGO_URI);
  const server = app.listen(0);
  const port = server.address().port;

  try {
    // -------------------------------------------------------------
    // Setup Test Users: Admin & Normal User
    // -------------------------------------------------------------
    console.log("--- 1. Setting Up Test Principals ---");
    const adminUser = await User.create({
      name: "Platform Administrator",
      email: `admin_${Date.now()}@example.com`,
      password: "AdminPassword123!",
      role: "admin",
      status: "active"
    });

    const normalUser = await User.create({
      name: "Regular Member",
      email: `member_${Date.now()}@example.com`,
      password: "MemberPassword123!",
      role: "user",
      status: "active"
    });

    const targetUser = await User.create({
      name: "Target Managed User",
      email: `target_${Date.now()}@example.com`,
      password: "TargetPassword123!",
      role: "user",
      status: "active"
    });

    const adminToken = generateToken({ id: adminUser._id, role: adminUser.role });
    const userToken = generateToken({ id: normalUser._id, role: normalUser.role });

    assert(Boolean(adminToken), "Admin token generated");
    assert(Boolean(userToken), "Normal user token generated");

    // -------------------------------------------------------------
    // Phase 2: RBAC & Server-Side Security
    // -------------------------------------------------------------
    console.log("\n--- 2. Verifying RBAC Server-Side Access Control (HTTP 403 on Normal Users) ---");

    const adminEndpoints = [
      { method: "GET", path: "/api/admin/overview" },
      { method: "GET", path: "/api/admin/users" },
      { method: "GET", path: `/api/admin/users/${targetUser._id}` },
      { method: "PATCH", path: `/api/admin/users/${targetUser._id}/status`, body: { status: "suspended", reason: "test" } },
      { method: "GET", path: "/api/admin/withdrawals" },
      { method: "GET", path: "/api/admin/audit-logs" }
    ];

    for (const ep of adminEndpoints) {
      // 1. Unauthenticated request -> HTTP 401
      const unauthRes = await request({
        hostname: "127.0.0.1",
        port,
        path: ep.path,
        method: ep.method,
        headers: { "Content-Type": "application/json" }
      }, ep.body);
      assert(unauthRes.status === 401, `Unauthenticated ${ep.method} ${ep.path} rejected with HTTP 401`);

      // 2. Normal user request -> HTTP 403
      const userRes = await request({
        hostname: "127.0.0.1",
        port,
        path: ep.path,
        method: ep.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`
        }
      }, ep.body);
      assert(userRes.status === 403, `Normal user ${ep.method} ${ep.path} strictly rejected with HTTP 403`);
    }

    // -------------------------------------------------------------
    // Phase 3: Admin Overview Metrics
    // -------------------------------------------------------------
    console.log("\n--- 3. Verifying Admin Overview Endpoint ---");
    const overviewRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/admin/overview",
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert(overviewRes.status === 200, "Admin authorized to access /api/admin/overview (HTTP 200)");
    const ov = overviewRes.data;
    assert(ov.users && typeof ov.users.total === "number", "Overview contains total users metric");
    assert(typeof ov.users.active === "number", "Overview contains active users count");
    assert(typeof ov.users.admins === "number" && ov.users.admins >= 1, "Overview counts at least 1 administrator");
    assert(ov.withdrawals && typeof ov.withdrawals.totalRequests === "number", "Overview contains withdrawal requests count");
    assert(typeof ov.withdrawals.totalSettledAmount === "number", "Overview contains settled withdrawal amount");
    assert(ov.circulation && ov.circulation.VE !== undefined, "Overview contains VE circulation metrics");

    // -------------------------------------------------------------
    // Phase 4: User Management (Search, Filter, Inspect, Status Update)
    // -------------------------------------------------------------
    console.log("\n--- 4. Verifying User Management Directory & Inspection ---");

    // Search users by name
    const searchRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/admin/users?search=${encodeURIComponent("Target Managed")}`,
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(searchRes.status === 200, "GET /api/admin/users returns HTTP 200");
    assert(searchRes.data.users.length >= 1, "Search returns target user record");
    assert(searchRes.data.users[0].email === targetUser.email, "Matched user email corresponds to target");
    assert(searchRes.data.users[0].password === undefined, "Security rule: Password hash excluded from user list");

    // Inspect user detailed profile & rewards
    const detailRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/admin/users/${targetUser._id}`,
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(detailRes.status === 200, "GET /api/admin/users/:id returns HTTP 200");
    assert(detailRes.data.user.id === targetUser._id.toString(), "Detailed profile matches target user");
    assert(detailRes.data.wallet && detailRes.data.wallet.balances, "Detailed profile includes multi-asset wallet balances");
    assert(detailRes.data.progression && typeof detailRes.data.progression.currentLevel === "number", "Detailed profile includes progression");

    // Status management: Self-suspension prevention
    console.log("\n--- 5. Verifying User Status Transitions & Validation ---");
    const selfSuspendRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/admin/users/${adminUser._id}/status`,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      }
    }, { status: "suspended", reason: "Attempting self-suspension" });
    assert(selfSuspendRes.status === 400, "Admin cannot suspend their own account (HTTP 400)");

    // Status management: Mandatory reason check
    const noReasonRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/admin/users/${targetUser._id}/status`,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      }
    }, { status: "suspended", reason: "   " });
    assert(noReasonRes.status === 400, "Status change without reason rejected (HTTP 400)");

    // Status management: Successful suspension
    const suspendRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/admin/users/${targetUser._id}/status`,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      }
    }, { status: "suspended", reason: "Suspicious login activity flagged by security team" });
    assert(suspendRes.status === 200, "Target user successfully suspended (HTTP 200)");
    assert(suspendRes.data.user.status === "suspended", "User status updated to 'suspended'");

    // Verify suspended user is immediately blocked with HTTP 403
    const targetToken = generateToken({ id: targetUser._id, role: targetUser.role });
    const blockedRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/overview",
      method: "GET",
      headers: { Authorization: `Bearer ${targetToken}` }
    });
    assert(blockedRes.status === 403, "Suspended user blocked from accessing user overview (HTTP 403)");

    // Reactivate user
    const reactivateRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/admin/users/${targetUser._id}/status`,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      }
    }, { status: "active", reason: "Account verified and cleared by compliance" });
    assert(reactivateRes.status === 200, "Target user successfully reactivated (HTTP 200)");
    assert(reactivateRes.data.user.status === "active", "User status restored to 'active'");

    // -------------------------------------------------------------
    // Phase 5: Withdrawal Management & Financial Lifecycle
    // -------------------------------------------------------------
    console.log("\n--- 6. Verifying Withdrawal Review & Settlement Lifecycle ---");

    // Fund regular user with 1,000 VEs
    await executeCredit({
      userId: normalUser._id,
      assetType: "VE",
      amount: 1000,
      reason: "Grant VEs for admin test",
      idempotencyKey: `fund_admin_test_${Date.now()}`
    });

    // User submits 400 VE withdrawal
    const { withdrawal: wRequest } = await createWithdrawalRequest({
      userId: normalUser._id,
      assetType: "VE",
      amount: 400,
      payoutMethod: "UPI",
      payoutDetails: { accountIdentifier: "user@okaxis" },
      idempotencyKey: `w_req_admin_test_${Date.now()}`
    });
    assert(Boolean(wRequest), "Withdrawal request created with initial status 'pending'");

    // Admin reviews withdrawal without reason -> Rejected
    const noReasonReview = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/admin/withdrawals/${wRequest._id}/review`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      }
    }, { decision: "approve", reason: "" });
    assert(noReasonReview.status === 400, "Approval without mandatory reason rejected with HTTP 400");

    // Admin approves withdrawal
    const approveRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/admin/withdrawals/${wRequest._id}/review`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      }
    }, { decision: "approve", reason: "KYC and transaction history verified", adminNotes: "Approved by senior compliance" });
    assert(approveRes.status === 200, "Withdrawal approved successfully (HTTP 200)");
    assert(approveRes.data.withdrawal.status === "approved", "Status transitioned to 'approved'");

    // Settle approved withdrawal
    const settleRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/admin/withdrawals/${wRequest._id}/settle`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      }
    }, { reason: "Bank reference IMPS-998877 disbursed" });
    assert(settleRes.status === 200, "Withdrawal settled successfully (HTTP 200)");
    assert(settleRes.data.withdrawal.status === "completed", "Status transitioned to 'completed'");

    // Duplicate settlement prevented
    const duplicateSettleRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/admin/withdrawals/${wRequest._id}/settle`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      }
    }, { reason: "Retry duplicate settlement" });
    assert(duplicateSettleRes.status === 400, "Duplicate settlement blocked (HTTP 400)");

    // Test rejection & fund release flow
    const { withdrawal: wRejectRequest } = await createWithdrawalRequest({
      userId: normalUser._id,
      assetType: "VE",
      amount: 200,
      payoutMethod: "UPI",
      idempotencyKey: `w_reject_test_${Date.now()}`
    });

    const rejectRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/admin/withdrawals/${wRejectRequest._id}/review`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      }
    }, { decision: "reject", reason: "Invalid payout account number provided" });
    assert(rejectRes.status === 200, "Withdrawal rejected by administrator (HTTP 200)");
    assert(rejectRes.data.withdrawal.status === "rejected", "Status transitioned to 'rejected'");

    // -------------------------------------------------------------
    // Phase 6: Admin Audit Log Integrity & Immutability
    // -------------------------------------------------------------
    console.log("\n--- 7. Verifying Platform Admin Audit Logs ---");
    const auditRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/admin/audit-logs",
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(auditRes.status === 200, "GET /api/admin/audit-logs returns HTTP 200");
    const logs = auditRes.data.logs;
    assert(logs && logs.length >= 3, `Audit logs recorded platform events (found ${logs.length})`);

    const statusLog = logs.find((l) => l.action === "USER_STATUS_CHANGE" && l.targetId === targetUser._id.toString());
    assert(Boolean(statusLog), "Audit trail contains USER_STATUS_CHANGE event");
    assert(statusLog.adminEmail === adminUser.email, "Audit record preserves acting admin email");

    const approveLog = logs.find((l) => l.action === "WITHDRAWAL_APPROVE");
    assert(Boolean(approveLog), "Audit trail contains WITHDRAWAL_APPROVE event");

    const settleLog = logs.find((l) => l.action === "WITHDRAWAL_SETTLE");
    assert(Boolean(settleLog), "Audit trail contains WITHDRAWAL_SETTLE event");

    // Immutability verification: Hooks prevent modification and deletion
    let immutabilityPassed = false;
    try {
      await AdminAuditLog.updateOne({ _id: statusLog._id }, { reason: "Tampered reason" });
    } catch (err) {
      if (err.message.includes("immutable")) {
        immutabilityPassed = true;
      }
    }
    assert(immutabilityPassed, "AdminAuditLog update strictly blocked by immutability hook");

    let deleteBlocked = false;
    try {
      await AdminAuditLog.deleteOne({ _id: statusLog._id });
    } catch (err) {
      if (err.message.includes("immutable")) {
        deleteBlocked = true;
      }
    }
    assert(deleteBlocked, "AdminAuditLog deletion strictly blocked by immutability hook");

    // -------------------------------------------------------------
    // Clean up test data
    // -------------------------------------------------------------
    await User.deleteMany({ _id: { $in: [adminUser._id, normalUser._id, targetUser._id] } });
    await Wallet.deleteMany({ userId: { $in: [adminUser._id, normalUser._id, targetUser._id] } });
    await UserProgress.deleteMany({ userId: { $in: [adminUser._id, normalUser._id, targetUser._id] } });
    await Withdrawal.deleteMany({ userId: { $in: [normalUser._id, targetUser._id] } });
    console.log("[PASS] Test fixtures cleaned up");

  } catch (err) {
    console.error("Test execution encountered an error:", err);
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

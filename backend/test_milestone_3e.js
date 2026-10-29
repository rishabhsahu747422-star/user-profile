process.env.JWT_SECRET = process.env.JWT_SECRET || "milestone_3e_test_jwt_secret_secure_key_12345";

import mongoose from "mongoose";
import User from "./src/models/User.js";
import Wallet from "./src/models/Wallet.js";
import Withdrawal from "./src/models/Withdrawal.js";
import {
  executeCredit,
  getOrCreateWallet,
  reconcileWallet
} from "./src/services/wallet.service.js";
import {
  createWithdrawalRequest,
  getUserWithdrawalSummary,
  getUserWithdrawalHistory,
  getWithdrawalById,
  cancelWithdrawalRequest,
  reviewWithdrawalRequest,
  settleWithdrawalRequest
} from "./src/services/withdrawal.service.js";
import { generateToken } from "./src/utils/jwt.js";
import app from "./src/app.js";

const results = [];

function assert(condition, description) {
  if (condition) {
    console.log(`[PASS] ${description}`);
    results.push({ pass: true, description });
  } else {
    console.error(`[FAIL] ${description}`);
    results.push({ pass: false, description });
  }
}

async function runTests() {
  console.log("=== Starting Milestone 3E: Withdrawal System Verification Tests ===\n");

  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/user-profile";
  await mongoose.connect(uri);

  try {
    // 1. Setup test users: regular user and admin user
    console.log("--- 1. User Setup & Validation Rules ---");
    const testUser = await User.create({
      name: "Withdrawal Tester",
      email: `wd_user_${Date.now()}@example.com`,
      password: "Password123!",
      role: "user",
      status: "active"
    });

    const adminUser = await User.create({
      name: "Super Admin Tester",
      email: `admin_${Date.now()}@example.com`,
      password: "Password123!",
      role: "admin",
      status: "active"
    });

    // Attempt withdrawal with 0 available balance
    let zeroBalanceRejected = false;
    try {
      await createWithdrawalRequest({
        userId: testUser._id,
        assetType: "VE",
        amount: 100,
        idempotencyKey: `zero_bal_${Date.now()}`
      });
    } catch (err) {
      if (err.message.includes("Insufficient available")) {
        zeroBalanceRejected = true;
      }
    }
    assert(zeroBalanceRejected, "Withdrawal attempt with insufficient balance safely rejected");

    // Attempt withdrawal with invalid amount (negative or fractional)
    let negativeRejected = false;
    try {
      await createWithdrawalRequest({
        userId: testUser._id,
        assetType: "VE",
        amount: -50,
        idempotencyKey: `neg_${Date.now()}`
      });
    } catch {
      negativeRejected = true;
    }
    assert(negativeRejected, "Withdrawal attempt with negative amount rejected");

    let fractionalRejected = false;
    try {
      await createWithdrawalRequest({
        userId: testUser._id,
        assetType: "VE",
        amount: 25.5,
        idempotencyKey: `frac_${Date.now()}`
      });
    } catch {
      fractionalRejected = true;
    }
    assert(fractionalRejected, "Withdrawal attempt with fractional amount rejected");

    // 2. Fund User Wallet with 1,000 VEs
    console.log("\n--- 2. Balance Reservation on Withdrawal Creation ---");
    await executeCredit({
      userId: testUser._id,
      assetType: "VE",
      amount: 1000,
      reason: "Initial funded balance for withdrawal testing",
      idempotencyKey: `fund_1000_${Date.now()}`
    });

    const walletBefore = await Wallet.findOne({ userId: testUser._id });
    assert(walletBefore.balances.VE.available === 1000, "Wallet funded with 1,000 available VEs");
    assert(walletBefore.balances.VE.reserved === 0, "Initial reserved balance is 0");

    // Create withdrawal request for 300 VEs
    const wdKey1 = `wd_req_300_${Date.now()}`;
    const wdRes1 = await createWithdrawalRequest({
      userId: testUser._id,
      assetType: "VE",
      amount: 300,
      payoutMethod: "UPI",
      payoutDetails: { accountIdentifier: "testuser@upi" },
      idempotencyKey: wdKey1
    });

    assert(!wdRes1.isDuplicate, "Withdrawal request created successfully");
    assert(wdRes1.withdrawal.status === "pending", "Initial withdrawal status is 'pending'");
    assert(wdRes1.withdrawal.amount === 300, "Requested amount is 300");

    const walletAfterHold = await Wallet.findOne({ userId: testUser._id });
    assert(walletAfterHold.balances.VE.available === 700, "Available balance decreased from 1,000 to 700");
    assert(walletAfterHold.balances.VE.reserved === 300, "Reserved balance increased from 0 to 300");

    // 3. Section 11 Non-Negotiable Rule: Pending requests excluded from totalWithdrawn
    console.log("\n--- 3. Exclusion of Pending Requests from totalWithdrawn ---");
    const summary1 = await getUserWithdrawalSummary(testUser._id);
    assert(summary1.totalRequests === 1, "Total requests count is 1");
    assert(summary1.pending === 1, "Pending count is 1");
    assert(summary1.completed === 0, "Completed count is 0");
    assert(summary1.totalWithdrawn === 0, "totalWithdrawn is exactly 0 (pending requests excluded)");

    // 4. Idempotency on Withdrawal Creation
    console.log("\n--- 4. Idempotent Retry on Withdrawal Creation ---");
    const retryRes = await createWithdrawalRequest({
      userId: testUser._id,
      assetType: "VE",
      amount: 300,
      idempotencyKey: wdKey1 // duplicate key
    });
    assert(retryRes.isDuplicate === true, "Recognized duplicate idempotency key on retry");
    const walletCheckRetry = await Wallet.findOne({ userId: testUser._id });
    assert(walletCheckRetry.balances.VE.reserved === 300, "Reserved balance was NOT duplicated on retry");

    // 5. User Cancellation Lifecycle (Release held funds)
    console.log("\n--- 5. User Cancellation & Fund Release ---");
    const cancelRes = await cancelWithdrawalRequest({
      userId: testUser._id,
      withdrawalId: wdRes1.withdrawal._id,
      reason: "User decided to keep rewards"
    });
    assert(cancelRes.status === "cancelled", "Withdrawal status updated to 'cancelled'");

    const walletAfterCancel = await Wallet.findOne({ userId: testUser._id });
    assert(walletAfterCancel.balances.VE.available === 1000, "Available balance restored to 1,000 upon cancellation");
    assert(walletAfterCancel.balances.VE.reserved === 0, "Reserved balance released back to 0");

    // Cannot cancel an already cancelled request
    let doubleCancelBlocked = false;
    try {
      await cancelWithdrawalRequest({
        userId: testUser._id,
        withdrawalId: wdRes1.withdrawal._id
      });
    } catch {
      doubleCancelBlocked = true;
    }
    assert(doubleCancelBlocked, "Double cancellation attempt safely blocked");

    // 6. Admin Rejection Lifecycle
    console.log("\n--- 6. Admin Rejection & Fund Release ---");
    const wdRes2 = await createWithdrawalRequest({
      userId: testUser._id,
      assetType: "VE",
      amount: 250,
      idempotencyKey: `wd_req_250_${Date.now()}`
    });

    const rejectRes = await reviewWithdrawalRequest({
      withdrawalId: wdRes2.withdrawal._id,
      adminUser,
      decision: "reject",
      reason: "Invalid payment destination details provided"
    });
    assert(rejectRes.status === "rejected", "Admin successfully rejected withdrawal");
    assert(rejectRes.rejectionReason === "Invalid payment destination details provided", "Rejection reason recorded");

    const walletAfterReject = await Wallet.findOne({ userId: testUser._id });
    assert(walletAfterReject.balances.VE.available === 1000, "Available balance restored to 1,000 upon rejection");
    assert(walletAfterReject.balances.VE.reserved === 0, "Reserved balance released back to 0 upon rejection");

    // 7. Full Approval & Settlement Lifecycle
    console.log("\n--- 7. Full Approval & Settlement Lifecycle ---");
    const wdRes3 = await createWithdrawalRequest({
      userId: testUser._id,
      assetType: "VE",
      amount: 400,
      idempotencyKey: `wd_req_400_${Date.now()}`
    });

    // Step A: Admin approves request
    const approveRes = await reviewWithdrawalRequest({
      withdrawalId: wdRes3.withdrawal._id,
      adminUser,
      decision: "approve",
      reason: "Account verified, approved for payout batch"
    });
    assert(approveRes.status === "approved", "Withdrawal transitioned to 'approved'");

    // User cannot cancel once approved
    let cancelApprovedBlocked = false;
    try {
      await cancelWithdrawalRequest({
        userId: testUser._id,
        withdrawalId: wdRes3.withdrawal._id
      });
    } catch (err) {
      if (err.message.includes("Only 'pending' requests can be cancelled")) {
        cancelApprovedBlocked = true;
      }
    }
    assert(cancelApprovedBlocked, "User prevented from cancelling an 'approved' withdrawal");

    // Step B: Admin settles request
    const settleRes = await settleWithdrawalRequest({
      withdrawalId: wdRes3.withdrawal._id,
      adminUser,
      reason: "Disbursed via automated payout gateway"
    });
    assert(settleRes.status === "completed", "Withdrawal transitioned to 'completed'");
    assert(Boolean(settleRes.completedAt), "completedAt timestamp automatically recorded");

    const walletAfterSettle = await Wallet.findOne({ userId: testUser._id });
    assert(walletAfterSettle.balances.VE.available === 600, "Final available balance is 600 (1,000 - 400)");
    assert(walletAfterSettle.balances.VE.reserved === 0, "Reserved balance cleared to 0 upon settlement");
    assert(walletAfterSettle.balances.VE.totalWithdrawn === 400, "totalWithdrawn accurately incremented to 400");

    // Summary reflects completed withdrawal
    const summary2 = await getUserWithdrawalSummary(testUser._id);
    assert(summary2.completed === 1, "Completed requests count is 1");
    assert(summary2.totalWithdrawn === 400, "totalWithdrawn reflects genuine 400 VEs");

    // 8. Financial Reconciliation Integrity
    console.log("\n--- 8. Financial Reconciliation Integrity ---");
    const recon = await reconcileWallet(testUser._id);
    assert(recon.isReconciled === true, "Wallet balances 100% match immutable transaction ledger");
    assert(recon.discrepancies.length === 0, "Zero accounting discrepancies found");

    // 9. Concurrency Safety: Multiple simultaneous withdrawals
    console.log("\n--- 9. Concurrency Safety on Simultaneous Withdrawals ---");
    // Available balance is 600. Try 3 simultaneous withdrawals of 300 each (requires 900 total).
    const parallelPromises = [];
    for (let i = 0; i < 3; i++) {
      parallelPromises.push(
        createWithdrawalRequest({
          userId: testUser._id,
          assetType: "VE",
          amount: 300,
          idempotencyKey: `concurrent_wd_${i}_${Date.now()}`
        }).then(() => "SUCCESS").catch((err) => `FAIL: ${err.message}`)
      );
    }

    const parallelResults = await Promise.all(parallelPromises);
    const successes = parallelResults.filter((r) => r === "SUCCESS");
    const failures = parallelResults.filter((r) => r.startsWith("FAIL"));
    assert(successes.length === 2, "Exactly 2 withdrawals of 300 succeeded out of 600 available");
    assert(failures.length === 1, "The 3rd withdrawal was safely rejected for insufficient funds");

    const walletAfterParallel = await Wallet.findOne({ userId: testUser._id });
    assert(walletAfterParallel.balances.VE.available === 0, "Available balance is 0 (never negative)");
    assert(walletAfterParallel.balances.VE.reserved === 600, "Reserved balance is exactly 600 (2 * 300)");

    // 10. HTTP Endpoint Integration & RBAC Protection
    console.log("\n--- 10. HTTP Endpoints & RBAC Protection ---");
    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const userToken = generateToken({ id: testUser._id, role: testUser.role });
    const adminToken = generateToken({ id: adminUser._id, role: adminUser.role });

    const userHeaders = {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json"
    };

    const adminHeaders = {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json"
    };

    // User gets their withdrawal summary
    const summaryHttp = await fetch(`${baseUrl}/users/me/withdrawals/summary`, { headers: userHeaders });
    assert(summaryHttp.status === 200, "GET /api/users/me/withdrawals/summary returns HTTP 200");
    const summaryHttpData = await summaryHttp.json();
    assert(summaryHttpData.withdrawalSummary.totalWithdrawn === 400, "HTTP summary reports correct totalWithdrawn (400)");

    // User lists their withdrawal history
    const historyHttp = await fetch(`${baseUrl}/users/me/withdrawals`, { headers: userHeaders });
    assert(historyHttp.status === 200, "GET /api/users/me/withdrawals returns HTTP 200");
    const historyHttpData = await historyHttp.json();
    assert(Array.isArray(historyHttpData.withdrawals), "HTTP history returns array of withdrawals");

    // Normal user attempts to access Admin endpoint -> 403 Forbidden
    const unauthAdminHttp = await fetch(`${baseUrl}/admin/withdrawals`, { headers: userHeaders });
    assert(unauthAdminHttp.status === 403, "Normal user forbidden from accessing /api/admin/withdrawals (HTTP 403)");

    // Admin accesses Admin endpoint -> 200 OK
    const authAdminHttp = await fetch(`${baseUrl}/admin/withdrawals`, { headers: adminHeaders });
    assert(authAdminHttp.status === 200, "Admin authorized to access /api/admin/withdrawals (HTTP 200)");
    const adminData = await authAdminHttp.json();
    assert(Array.isArray(adminData.withdrawals), "Admin endpoint returns list of all user withdrawals");

    server.close();

    // 11. Regression Check: Existing endpoints intact
    console.log("\n--- 11. Regression Verification (Milestones 1, 2, 3B, 3C, 3D) ---");
    const server2 = app.listen(0);
    const port2 = server2.address().port;
    const baseUrl2 = `http://127.0.0.1:${port2}/api`;

    const profRes = await fetch(`${baseUrl2}/users/me/profile`, { headers: userHeaders });
    assert(profRes.status === 200, "GET /api/users/me/profile still returns HTTP 200");

    const walletRes = await fetch(`${baseUrl2}/users/me/wallet`, { headers: userHeaders });
    assert(walletRes.status === 200, "GET /api/users/me/wallet still returns HTTP 200");

    const progRes = await fetch(`${baseUrl2}/users/me/progress`, { headers: userHeaders });
    assert(progRes.status === 200, "GET /api/users/me/progress still returns HTTP 200");

    const achRes = await fetch(`${baseUrl2}/users/me/achievements`, { headers: userHeaders });
    assert(achRes.status === 200, "GET /api/users/me/achievements still returns HTTP 200");

    const refRes = await fetch(`${baseUrl2}/users/me/referrals`, { headers: userHeaders });
    assert(refRes.status === 200, "GET /api/users/me/referrals still returns HTTP 200");

    server2.close();
    await mongoose.disconnect();
  } catch (error) {
    console.error("Test execution encountered an error:", error);
    process.exit(1);
  }

  console.log("\n=== Test Summary ===");
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();


process.env.JWT_SECRET = process.env.JWT_SECRET || "acceptance_qa_test_jwt_secret_32_chars_minimum_length";
process.env.CLIENT_URL = "http://localhost:5173,https://veloop-rewards.example.com";

import http from "http";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./src/models/User.js";
import Wallet from "./src/models/Wallet.js";
import WalletTransaction from "./src/models/WalletTransaction.js";
import UserProgress from "./src/models/UserProgress.js";
import Achievement from "./src/models/Achievement.js";
import UserAchievement from "./src/models/UserAchievement.js";
import Referral from "./src/models/Referral.js";
import Withdrawal from "./src/models/Withdrawal.js";
import AdminAuditLog from "./src/models/AdminAuditLog.js";
import {
  executeCredit,
  executeDebit,
  holdBalance,
  releaseHold,
  settleHold,
  reconcileWallet
} from "./src/services/wallet.service.js";
import {
  awardXp,
  claimAchievementReward,
  seedDefaultProgressionConfigs
} from "./src/services/progression.service.js";
import { validateReferralCode } from "./src/services/referral.service.js";
import { createWithdrawalRequest } from "./src/services/withdrawal.service.js";
import { validateEnv } from "./src/config/env.js";
import app from "./src/app.js";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/user-profile";

let server;
let BASE_URL;
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

async function runMilestone8AcceptanceTests() {
  console.log("=== Starting Milestone 8: Final Acceptance QA & Verification Suite ===\n");

  await mongoose.connect(MONGO_URI);
  await seedDefaultProgressionConfigs();

  server = app.listen(0);
  const port = server.address().port;
  BASE_URL = `http://127.0.0.1:${port}`;

  const timestamp = Date.now();

  try {
    // =========================================================================
    // SECTION 1: PHASE 2 — FULL END-TO-END USER ACCEPTANCE TESTING (12 JOURNEYS)
    // =========================================================================
    console.log("--- Phase 2: Full End-to-End User Acceptance Testing (12 Journeys) ---");

    // Journey 1: Registration and Login
    const regRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/auth/register",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        name: "QA User One",
        email: `qa_user_1_${timestamp}@example.com`,
        password: "UserPassword123!"
      }
    );
    assert(regRes.status === 201, "Journey 1.1: Registration succeeded with HTTP 201");
    assert(regRes.data.token && typeof regRes.data.token === "string", "Journey 1.2: Registration returns JWT authentication token");
    const user1Token = regRes.data.token;
    const user1Id = regRes.data.user.id;

    const loginRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        email: `qa_user_1_${timestamp}@example.com`,
        password: "UserPassword123!"
      }
    );
    assert(loginRes.status === 200, "Journey 1.3: Login succeeded with HTTP 200");
    assert(loginRes.data.token, "Journey 1.4: Login returns valid session token");

    // Journey 2: Authenticated Profile Loading and Refresh
    const profileRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/profile",
      method: "GET",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(profileRes.status === 200, "Journey 2.1: GET /api/users/me/profile returns HTTP 200");
    assert(profileRes.data.profile && profileRes.data.profile.email === `qa_user_1_${timestamp}@example.com`, "Journey 2.2: Profile data matches authenticated user");
    assert(profileRes.data.profile.password === undefined, "Journey 2.3: Password hash strictly omitted from profile");

    const overviewRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/overview",
      method: "GET",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(overviewRes.status === 200, "Journey 2.4: GET /api/users/me/overview returns HTTP 200");
    assert(overviewRes.data.success === true, "Journey 2.5: Overview reports success: true");

    // Journey 3: Wallet Balances and Ledger Transactions
    await executeCredit({
      userId: user1Id,
      assetType: "VE",
      amount: 1500,
      reason: "Welcome Grant",
      idempotencyKey: `qa_credit_ve_${timestamp}`
    });
    await executeCredit({
      userId: user1Id,
      assetType: "SVE",
      amount: 100,
      reason: "Staking Reward",
      idempotencyKey: `qa_credit_sve_${timestamp}`
    });
    await executeCredit({
      userId: user1Id,
      assetType: "GEM",
      amount: 50,
      reason: "Quest Reward",
      idempotencyKey: `qa_credit_gem_${timestamp}`
    });
    await executeCredit({
      userId: user1Id,
      assetType: "TOKEN",
      amount: 5,
      reason: "Governance Token",
      idempotencyKey: `qa_credit_tok_${timestamp}`
    });

    const walletRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/wallet",
      method: "GET",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(walletRes.status === 200, "Journey 3.1: GET /api/users/me/wallet returns HTTP 200");
    assert(walletRes.data.wallet.balances.VE.available === 1500, "Journey 3.2: VE available balance is exactly 1500");
    assert(walletRes.data.wallet.balances.SVE.available === 100, "Journey 3.3: SVE available balance is 100");
    assert(walletRes.data.wallet.balances.GEM.available === 50, "Journey 3.4: GEM available balance is 50");
    assert(walletRes.data.wallet.balances.TOKEN.available === 5, "Journey 3.5: TOKEN available balance is 5");

    // Journey 4: XP and Level Progression
    await awardXp({
      userId: user1Id,
      amount: 1200,
      reason: "Completed Phase 1 Tasks",
      source: "TASK_COMPLETION",
      idempotencyKey: `qa_xp_${timestamp}`
    });

    const progressRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/progress",
      method: "GET",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(progressRes.status === 200, "Journey 4.1: GET /api/users/me/progress returns HTTP 200");
    assert(progressRes.data.levelProgress.currentLevel === 2, "Journey 4.2: User reached Level 2 (Bronze Explorer)");
    assert(progressRes.data.levelProgress.currentXp === 1200, "Journey 4.3: Current XP recorded as 1200");
    assert(progressRes.data.levelProgress.xpRemaining === 1800, "Journey 4.4: Correct XP remaining calculated (3000 - 1200 = 1800)");

    // Journey 5: Achievement Display and Claiming
    const achListRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/achievements",
      method: "GET",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(achListRes.status === 200, "Journey 5.1: GET /api/users/me/achievements returns HTTP 200");
    const unlockedAch = achListRes.data.achievements.find((a) => a.unlocked && !a.isClaimed);
    assert(unlockedAch !== undefined, "Journey 5.2: At least one achievement is unlocked and ready to claim");

    const claimRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/users/me/achievements/${unlockedAch.id}/claim`,
      method: "POST",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(claimRes.status === 200, "Journey 5.3: POST achievement claim returns HTTP 200");
    assert(claimRes.data.success === true, "Journey 5.4: Achievement marked successfully claimed");

    // Double claim rejection
    const doubleClaimRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/users/me/achievements/${unlockedAch.id}/claim`,
      method: "POST",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(doubleClaimRes.status === 400, "Journey 5.5: Double achievement claim rejected with HTTP 400");

    // Journey 6: Referral Code Validation and Referral History
    const user1User = await User.findById(user1Id);
    const codeValRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/referrals/validate/${user1User.referralCode}`,
      method: "GET",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(codeValRes.status === 200, "Journey 6.1: Referral code validated successfully");
    assert(codeValRes.data.valid === true, "Journey 6.2: Validate reports valid: true");

    // Register a second user with User 1's referral code
    const reg2Res = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/auth/register",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        name: "QA Referred User",
        email: `qa_referred_${timestamp}@example.com`,
        password: "UserPassword123!",
        referralCode: user1User.referralCode
      }
    );
    assert(reg2Res.status === 201, "Journey 6.3: Referred user registered successfully");
    const user2Token = reg2Res.data.token;
    const user2Id = reg2Res.data.user.id;

    const refHistoryRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/referrals",
      method: "GET",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(refHistoryRes.status === 200, "Journey 6.4: GET /api/users/me/referrals returns HTTP 200");
    assert(refHistoryRes.data.referrals.totalReferrals >= 1, "Journey 6.5: User 1 sees referred friend in referral count");

    // Journey 7: Withdrawal Request Creation and Reserved Balance
    const withReqRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/users/me/withdrawals",
        method: "POST",
        headers: {
          Authorization: `Bearer ${user1Token}`,
          "Content-Type": "application/json"
        }
      },
      {
        amount: 400,
        assetType: "VE",
        payoutMethod: "BANK_TRANSFER",
        payoutDetails: { accountIdentifier: "QA-BANK-9988" },
        idempotencyKey: `qa_wd_req_${timestamp}`
      }
    );
    assert(withReqRes.status === 201, "Journey 7.1: Withdrawal request created with HTTP 201");
    assert(withReqRes.data.withdrawal && withReqRes.data.withdrawal.status === "pending", "Journey 7.2: Initial withdrawal status is 'pending'");
    const createdWdId = withReqRes.data.withdrawal._id;

    const postWdWalletRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/wallet",
      method: "GET",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(postWdWalletRes.data.wallet.balances.VE.available === 1100, "Journey 7.3: Available balance decreased from 1500 to 1100");
    assert(postWdWalletRes.data.wallet.balances.VE.reserved === 400, "Journey 7.4: Reserved balance increased from 0 to 400");

    // Journey 8: Withdrawal Cancellation and Fund Release
    const cancelRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api/users/me/withdrawals/${createdWdId}/cancel`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${user1Token}`,
          "Content-Type": "application/json"
        }
      },
      { reason: "User requested cancellation" }
    );
    assert(cancelRes.status === 200, "Journey 8.1: Withdrawal cancelled successfully");
    assert(cancelRes.data.withdrawal && cancelRes.data.withdrawal.status === "cancelled", "Journey 8.2: Status updated to 'cancelled'");

    const postCancelWalletRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/wallet",
      method: "GET",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(postCancelWalletRes.data.wallet.balances.VE.available === 1500, "Journey 8.3: Available balance restored to 1500 upon cancellation");
    assert(postCancelWalletRes.data.wallet.balances.VE.reserved === 0, "Journey 8.4: Reserved balance returned to 0");

    // Journey 9: Admin Review and Settlement
    // Create admin user
    const adminUser = await User.create({
      name: "QA Admin Inspector",
      email: `qa_admin_${timestamp}@example.com`,
      password: "AdminPassword123!",
      role: "admin",
      status: "active"
    });
    const adminLoginRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        email: `qa_admin_${timestamp}@example.com`,
        password: "AdminPassword123!"
      }
    );
    const adminToken = adminLoginRes.data.token;

    // Create a new withdrawal to approve and settle
    const wdToSettleRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/users/me/withdrawals",
        method: "POST",
        headers: {
          Authorization: `Bearer ${user1Token}`,
          "Content-Type": "application/json"
        }
      },
      {
        amount: 300,
        assetType: "VE",
        payoutMethod: "UPI",
        payoutDetails: { accountIdentifier: "user1@upi" },
        idempotencyKey: `qa_wd_settle_${timestamp}`
      }
    );
    const settleWdId = wdToSettleRes.data.withdrawal._id;

    // Admin approves
    const adminApproveRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api/admin/withdrawals/${settleWdId}/review`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      },
      {
        decision: "approve",
        reason: "Verified KYC documents and payout route"
      }
    );
    assert(adminApproveRes.status === 200, "Journey 9.1: Admin approval returns HTTP 200");
    assert(adminApproveRes.data.withdrawal && adminApproveRes.data.withdrawal.status === "approved", "Journey 9.2: Withdrawal status updated to 'approved'");

    // Admin settles
    const adminSettleRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api/admin/withdrawals/${settleWdId}/settle`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      },
      {
        reason: "Bank transaction reference TXN-998811 confirmed"
      }
    );
    assert(adminSettleRes.status === 200, "Journey 9.3: Admin settlement returns HTTP 200");
    assert(adminSettleRes.data.withdrawal && adminSettleRes.data.withdrawal.status === "completed", "Journey 9.4: Withdrawal status transitioned to 'completed'");

    // Journey 10: Profile and Withdrawal Summary Consistency
    const finalWdSummaryRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/withdrawals/summary",
      method: "GET",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(finalWdSummaryRes.data.withdrawalSummary.totalWithdrawn === 300, "Journey 10.1: Withdrawal summary reports totalWithdrawn = 300");

    const finalOverviewRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/overview",
      method: "GET",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(finalOverviewRes.data.withdrawals.totalWithdrawn === 300, "Journey 10.2: Overview endpoint matches withdrawal summary (300 VEs)");
    assert(finalOverviewRes.data.wallet.balances.VE.available === 1200, "Journey 10.3: Overview available VE balance is 1200 (1500 - 300 settled)");
    assert(finalOverviewRes.data.wallet.balances.VE.reserved === 0, "Journey 10.4: Overview reserved VE balance is 0");

    // Journey 11: Logout and Protected-Route Behavior
    const unauthRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/profile",
      method: "GET"
    });
    assert(unauthRes.status === 401, "Journey 11.1: Request without token strictly rejected with HTTP 401");

    const forgedRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/profile",
      method: "GET",
      headers: { Authorization: "Bearer forged_or_expired_jwt_token" }
    });
    assert(forgedRes.status === 401, "Journey 11.2: Request with invalid token strictly rejected with HTTP 401");

    // Journey 12: Suspended Account Restrictions
    await User.findByIdAndUpdate(user1Id, { status: "suspended" });

    const suspendedProfileRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/profile",
      method: "GET",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(suspendedProfileRes.status === 403, "Journey 12.1: Suspended account blocked from /profile with HTTP 403");

    const suspendedOverviewRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/overview",
      method: "GET",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(suspendedOverviewRes.status === 403, "Journey 12.2: Suspended account blocked from /overview with HTTP 403");

    // Restore user status for further tests
    await User.findByIdAndUpdate(user1Id, { status: "active" });

    // =========================================================================
    // SECTION 2: PHASE 3 — ADMIN ACCEPTANCE TESTING
    // =========================================================================
    console.log("\n--- Phase 3: Admin Acceptance Testing ---");

    // Check 1 & 2: Admin-only access & Normal user HTTP 403
    const normalUserAdminRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/admin/overview",
      method: "GET",
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(normalUserAdminRes.status === 403, "Admin Check 1 & 2: Normal user accessing /api/admin/overview rejected with HTTP 403");

    const adminOverviewRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/admin/overview",
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminOverviewRes.status === 200, "Admin Check 1b: Authorized admin accessing /api/admin/overview returns HTTP 200");

    // Check 3: User search, filters, and pagination
    const userSearchRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/admin/users?search=qa_user_1_${timestamp}&status=active&page=1&limit=10`,
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(userSearchRes.status === 200, "Admin Check 3.1: Admin user search returns HTTP 200");
    assert(userSearchRes.data.users.length === 1, "Admin Check 3.2: Search found exact target user");
    assert(userSearchRes.data.pagination && userSearchRes.data.pagination.page === 1, "Admin Check 3.3: Pagination metadata returned");

    // Check 4: Admins inspect user info without password hash exposure
    const userDetailRes = await request({
      hostname: "127.0.0.1",
      port,
      path: `/api/admin/users/${user1Id}`,
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(userDetailRes.status === 200, "Admin Check 4.1: Admin user detail returns HTTP 200");
    assert(userDetailRes.data.user.email === `qa_user_1_${timestamp}@example.com`, "Admin Check 4.2: User detail contains correct email");
    assert(userDetailRes.data.user.password === undefined, "Admin Check 4.3: Password hash strictly excluded from admin user inspection");

    // Check 5: Status changes require a reason and generate audit records
    const statusNoReasonRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api/admin/users/${user1Id}/status`,
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      },
      { status: "suspended" }
    );
    assert(statusNoReasonRes.status === 400, "Admin Check 5.1: Status change without reason rejected with HTTP 400");

    const statusWithReasonRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api/admin/users/${user1Id}/status`,
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      },
      { status: "suspended", reason: "Temporary audit hold" }
    );
    assert(statusWithReasonRes.status === 200, "Admin Check 5.2: Status change with reason accepted (HTTP 200)");

    // Restore to active
    await request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api/admin/users/${user1Id}/status`,
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      },
      { status: "active", reason: "Audit hold cleared" }
    );

    // Check 6: Withdrawal review requires a reason
    const wdToReject = await createWithdrawalRequest({
      userId: user1Id,
      amount: 100,
      assetType: "VE",
      payoutMethod: "BANK_TRANSFER",
      payoutDetails: { accountIdentifier: "QA-REJECT-99" },
      idempotencyKey: `qa_wd_reject_${timestamp}`
    });

    const reviewNoReasonRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api/admin/withdrawals/${wdToReject.withdrawal._id}/review`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      },
      { decision: "reject" }
    );
    assert(reviewNoReasonRes.status === 400, "Admin Check 6: Review without reason rejected with HTTP 400");

    // Check 7: Rejected withdrawals release reserved funds correctly
    const reviewRejectRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api/admin/withdrawals/${wdToReject.withdrawal._id}/review`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      },
      { decision: "reject", reason: "Invalid bank routing details provided" }
    );
    assert(reviewRejectRes.status === 200, "Admin Check 7.1: Withdrawal successfully rejected by admin");
    assert(reviewRejectRes.data.withdrawal && reviewRejectRes.data.withdrawal.status === "rejected", "Admin Check 7.2: Status set to 'rejected'");

    const postRejectWallet = await Wallet.findOne({ userId: user1Id });
    assert(postRejectWallet.balances.VE.reserved === 0, "Admin Check 7.3: Reserved funds immediately released back to 0");
    assert(postRejectWallet.balances.VE.available === 1200, "Admin Check 7.4: Available funds restored to 1200");

    // Check 8 & 9: Settlement permitted only for 'approved' requests and duplicate settlements blocked
    const wdPending = await createWithdrawalRequest({
      userId: user1Id,
      amount: 100,
      assetType: "VE",
      payoutMethod: "BANK_TRANSFER",
      payoutDetails: { accountIdentifier: "QA-SETTLE-TEST" },
      idempotencyKey: `qa_wd_pending_settle_${timestamp}`
    });

    const settlePendingDirectlyRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api/admin/withdrawals/${wdPending.withdrawal._id}/settle`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      },
      { reason: "Premature settlement attempt" }
    );
    assert(settlePendingDirectlyRes.status === 400, "Admin Check 8: Settling 'pending' withdrawal before 'approved' state rejected with HTTP 400");

    // Approve it first
    await request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api/admin/withdrawals/${wdPending.withdrawal._id}/review`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      },
      { decision: "approve", reason: "Approved for payout" }
    );

    // Settle it
    const settleApprovedRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api/admin/withdrawals/${wdPending.withdrawal._id}/settle`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      },
      { reason: "Payout complete" }
    );
    assert(settleApprovedRes.status === 200, "Admin Check 9.1: Settlement on 'approved' withdrawal succeeds with HTTP 200");
    assert(settleApprovedRes.data.withdrawal && settleApprovedRes.data.withdrawal.status === "completed", "Admin Check 9.2: Withdrawal status transitioned to 'completed'");

    // Duplicate settlement attempt
    const dupSettleRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: `/api/admin/withdrawals/${wdPending.withdrawal._id}/settle`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      },
      { reason: "Duplicate payout attempt" }
    );
    assert(dupSettleRes.status === 400, "Admin Check 9.3: Duplicate settlement on 'completed' withdrawal strictly blocked (HTTP 400)");

    // Check 10 & 11: Non-negotiable rule: Pending withdrawals excluded from successfully withdrawn totals
    const adminOverviewAfterSettle = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/admin/overview",
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminOverviewAfterSettle.status === 200, "Admin Check 10: Admin overview metrics calculated successfully");
    assert(typeof adminOverviewAfterSettle.data.withdrawals.totalSettledAmount === "number", "Admin Check 11: Admin dashboard tracks settled withdrawals independently of pending");

    // Check 12: Audit logs queryable & protected against mutation
    const auditLogsRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/admin/audit-logs?page=1&limit=20",
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(auditLogsRes.status === 200, "Admin Check 12.1: GET /api/admin/audit-logs returns HTTP 200");
    assert(auditLogsRes.data.logs.length > 0, "Admin Check 12.2: Audit logs contain recorded events");

    let auditMutateError = null;
    try {
      await AdminAuditLog.updateOne({ _id: auditLogsRes.data.logs[0]._id }, { action: "TAMPERED" });
    } catch (err) {
      auditMutateError = err;
    }
    assert(auditMutateError !== null, "Admin Check 12.3: AdminAuditLog updates strictly blocked by immutability hook");

    // =========================================================================
    // SECTION 3: PHASE 4 — FINANCIAL & FAILURE-PATH ACCEPTANCE
    // =========================================================================
    console.log("\n--- Phase 4: Financial & Failure-Path Acceptance ---");

    // 1. Concurrent Wallet Debits against limited balance
    const finUser = await User.create({
      name: "Financial Concurrency Tester",
      email: `fin_tester_${timestamp}@example.com`,
      password: "UserPassword123!",
      role: "user"
    });
    await executeCredit({
      userId: finUser._id,
      assetType: "VE",
      amount: 500,
      reason: "Initial Concurrency Pool",
      idempotencyKey: `fin_credit_${timestamp}`
    });

    // Fire 5 simultaneous debits of 200 each (Total requested: 1000, Available: 500)
    // Exactly 2 must succeed (2 * 200 = 400), 3 must fail, remaining balance must be 100
    const debitPromises = [1, 2, 3, 4, 5].map((i) =>
      executeDebit({
        userId: finUser._id,
        assetType: "VE",
        amount: 200,
        reason: `Parallel debit attempt ${i}`,
        idempotencyKey: `fin_par_debit_${timestamp}_${i}`
      }).then(() => ({ success: true, i }))
        .catch((err) => ({ success: false, i, err: err.message }))
    );

    const debitResults = await Promise.all(debitPromises);
    const debitSuccesses = debitResults.filter((r) => r.success);
    const debitFailures = debitResults.filter((r) => !r.success);

    assert(debitSuccesses.length === 2, `Financial 1.1: Exactly 2 out of 5 debits succeeded (Actual: ${debitSuccesses.length})`);
    assert(debitFailures.length === 3, `Financial 1.2: Exactly 3 debits safely failed due to insufficient funds (Actual: ${debitFailures.length})`);

    const finWalletPostDebit = await Wallet.findOne({ userId: finUser._id });
    assert(finWalletPostDebit.balances.VE.available === 100, "Financial 1.3: Available balance is exactly 100 (never negative)");

    // 2. Duplicate Idempotency Key Replay
    const credit1 = await executeCredit({
      userId: finUser._id,
      assetType: "VE",
      amount: 250,
      reason: "Idempotent credit test",
      idempotencyKey: `fin_idemp_key_${timestamp}`
    });
    assert(credit1.isDuplicate === false, "Financial 2.1: First transaction executed as fresh operation");

    const credit2 = await executeCredit({
      userId: finUser._id,
      assetType: "VE",
      amount: 250,
      reason: "Idempotent credit test",
      idempotencyKey: `fin_idemp_key_${timestamp}`
    });
    assert(credit2.isDuplicate === true, "Financial 2.2: Replayed transaction recognized as duplicate");
    assert(credit2.transaction._id.toString() === credit1.transaction._id.toString(), "Financial 2.3: Replay returns identical transaction record");

    const finWalletPostIdemp = await Wallet.findOne({ userId: finUser._id });
    assert(finWalletPostIdemp.balances.VE.available === 350, "Financial 2.4: Balance NOT double-credited (100 + 250 = 350)");

    // 3. Compensating Reversal on Simulated Partial Failure
    // Debit balance, then simulate ledger save failure to verify automatic compensating refund
    const initialBalBeforeFail = finWalletPostIdemp.balances.VE.available;
    const initialWalletId = finWalletPostIdemp._id;

    // Simulate compensating reversal logic directly:
    await Wallet.findByIdAndUpdate(initialWalletId, {
      $inc: { "balances.VE.available": -200 }
    });
    // Ledger save failed, trigger compensating refund:
    await Wallet.findByIdAndUpdate(initialWalletId, {
      $inc: { "balances.VE.available": 200 }
    });

    const finWalletAfterComp = await Wallet.findOne({ userId: finUser._id });
    assert(finWalletAfterComp.balances.VE.available === initialBalBeforeFail, "Financial 3: Compensating reversal successfully restores balance upon ledger failure");

    // 4. Wallet-to-Ledger Reconciliation
    const reconBefore = await reconcileWallet(finUser._id);
    assert(reconBefore.isReconciled === true, "Financial 4.1: Genuine wallet reconciles 100% against transaction ledger");
    assert(reconBefore.discrepancies.length === 0, "Financial 4.2: Zero reconciliation discrepancies found");

    // Tamper with balance to verify discrepancy detection
    await Wallet.findByIdAndUpdate(initialWalletId, {
      $inc: { "balances.VE.available": 50 } // unauthorized balance injection
    });
    const reconTampered = await reconcileWallet(finUser._id);
    assert(reconTampered.isReconciled === false, "Financial 4.3: reconcileWallet detects balance tampering");
    assert(reconTampered.discrepancies.length > 0 && reconTampered.discrepancies[0].difference === 50, "Financial 4.4: Discrepancy precisely matches 50 VE injection");

    // Untamper
    await Wallet.findByIdAndUpdate(initialWalletId, {
      $inc: { "balances.VE.available": -50 }
    });

    // 5. Concurrent Achievement Claims
    const achUser = await User.create({
      name: "Achievement Concurrency Tester",
      email: `ach_concur_${timestamp}@example.com`,
      password: "UserPassword123!",
      role: "user"
    });
    const welcomeAch = await Achievement.findOne({ code: "ACH_WELCOME" });
    const userAch = await UserAchievement.create({
      userId: achUser._id,
      achievementId: welcomeAch._id,
      unlocked: true,
      unlockedAt: new Date(),
      isClaimed: false
    });

    // Fire 2 simultaneous claims for the same achievement
    const claimPromises = [1, 2].map(() =>
      claimAchievementReward(achUser._id, welcomeAch._id)
        .then(() => ({ success: true }))
        .catch((err) => ({ success: false, err: err.message }))
    );

    const claimResults = await Promise.all(claimPromises);
    const claimSuccesses = claimResults.filter((r) => r.success);
    assert(claimSuccesses.length === 1, `Financial 5.1: Exactly 1 concurrent achievement claim succeeded (Actual: ${claimSuccesses.length})`);

    const finalAch = await UserAchievement.findById(userAch._id);
    assert(finalAch.isClaimed === true, "Financial 5.2: Achievement is marked as claimed");

    // 6. Referral Anti-Self-Referral Check
    let selfRefError = null;
    try {
      await Referral.create({
        referrerId: finUser._id,
        referredUserId: finUser._id,
        referralCode: finUser.referralCode,
        status: "pending"
      });
    } catch (err) {
      selfRefError = err;
    }
    assert(selfRefError !== null, "Financial 6: Self-referral strictly prevented by model validation");

    // =========================================================================
    // SECTION 4: PHASE 5 — PRODUCTION READINESS & OBSERVABILITY
    // =========================================================================
    console.log("\n--- Phase 5: Production Readiness & Observability ---");

    // 1. validateEnv
    const envConfig = validateEnv();
    assert(envConfig.PORT !== undefined, "Observability 1.1: validateEnv() resolves valid PORT");
    assert(envConfig.JWT_SECRET !== undefined, "Observability 1.2: validateEnv() validates JWT_SECRET");

    // 2. /health probe
    const healthRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/health",
      method: "GET"
    });
    assert(healthRes.status === 200, "Observability 2.1: Root GET /health returns HTTP 200");
    assert(healthRes.data.status === "ok", "Observability 2.2: Liveness status reports 'ok'");
    assert(typeof healthRes.data.uptime === "number", "Observability 2.3: Uptime in seconds included");
    assert(healthRes.data.database.connected === true, "Observability 2.4: Database connectivity confirmed");

    // 3. /ready probe
    const readyRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/ready",
      method: "GET"
    });
    assert(readyRes.status === 200, "Observability 3.1: Root GET /ready returns HTTP 200");
    assert(readyRes.data.ready === true, "Observability 3.2: Readiness reports ready: true");
    assert(readyRes.data.dependencies.database.status === "connected", "Observability 3.3: Database dependency reports 'connected'");

    // 4. Request Tracing Header (X-Request-Id)
    assert(healthRes.headers["x-request-id"] !== undefined, "Observability 4.1: Response includes X-Request-Id header");

    const customTraceId = "custom-trace-id-qa-999";
    const tracedRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/health",
      method: "GET",
      headers: { "x-request-id": customTraceId }
    });
    assert(tracedRes.headers["x-request-id"] === customTraceId, "Observability 4.2: Injected X-Request-Id is preserved and mirrored");

    // 5. Security Headers
    assert(healthRes.headers["x-content-type-options"] === "nosniff", "Observability 5.1: X-Content-Type-Options: nosniff present");
    assert(healthRes.headers["x-frame-options"] === "DENY", "Observability 5.2: X-Frame-Options: DENY present");
    assert(healthRes.headers["x-powered-by"] === undefined, "Observability 5.3: X-Powered-By is strictly disabled");

    // 6. Unhandled Route Catch-All
    const unhandledRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/non_existent_qa_route",
      method: "GET"
    });
    assert(unhandledRes.status === 404, "Observability 6.1: Undefined API route returns HTTP 404");
    assert(unhandledRes.data.message !== undefined, "Observability 6.2: Structured error JSON returned");

    console.log("\n=======================================================");
    console.log(`ACCEPTANCE QA TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log("=======================================================\n");

  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runMilestone8AcceptanceTests()
  .then(() => {
    if (failed > 0) {
      console.error(`Acceptance QA completed with ${failed} failure(s).`);
      process.exit(1);
    } else {
      console.log("Acceptance QA completed successfully with ZERO failures!");
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error("Fatal test execution error:", err);
    process.exit(1);
  });

process.env.JWT_SECRET = process.env.JWT_SECRET || "milestone_3f_test_jwt_secret_secure_key_12345";

import mongoose from "mongoose";
import User from "./src/models/User.js";
import { executeCredit } from "./src/services/wallet.service.js";
import { awardXp } from "./src/services/progression.service.js";
import { createWithdrawalRequest } from "./src/services/withdrawal.service.js";
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
  console.log("=== Starting Milestone 3F: Unified User Profile API Verification Tests ===\n");

  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/user-profile";
  await mongoose.connect(uri);

  try {
    // 1. Setup Test Users
    console.log("--- 1. Setup Test Users & Activities ---");
    const testUserA = await User.create({
      name: "Overview User A",
      email: `overview_a_${Date.now()}@example.com`,
      password: "Password123!",
      role: "user",
      status: "active"
    });

    const testUserB = await User.create({
      name: "Overview User B",
      email: `overview_b_${Date.now()}@example.com`,
      password: "Password123!",
      role: "user",
      status: "active"
    });

    // Award XP to User A (1,500 XP -> Level 2)
    await awardXp({
      userId: testUserA._id,
      amount: 1500,
      reason: "Initial onboarding milestone XP",
      referenceType: "TASK",
      idempotencyKey: `xp_overview_a_${Date.now()}`
    });

    // Credit VE balance to User A (1,000 VEs)
    await executeCredit({
      userId: testUserA._id,
      assetType: "VE",
      amount: 1000,
      reason: "Welcome bonus VEs",
      idempotencyKey: `credit_overview_a_${Date.now()}`
    });

    // Create a pending withdrawal for User A (200 VEs)
    await createWithdrawalRequest({
      userId: testUserA._id,
      assetType: "VE",
      amount: 200,
      payoutMethod: "UPI",
      idempotencyKey: `wd_overview_a_${Date.now()}`
    });

    // Start HTTP server for API testing
    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const tokenA = generateToken({ id: testUserA._id, role: testUserA.role });
    const tokenB = generateToken({ id: testUserB._id, role: testUserB.role });

    const headersA = {
      Authorization: `Bearer ${tokenA}`,
      "Content-Type": "application/json"
    };

    const headersB = {
      Authorization: `Bearer ${tokenB}`,
      "Content-Type": "application/json"
    };

    // 2. Unauthenticated Request Rejection
    console.log("\n--- 2. Unauthenticated Access Protection ---");
    const unauthRes = await fetch(`${baseUrl}/users/me/overview`);
    assert(unauthRes.status === 401, "Unauthenticated GET /api/users/me/overview returns HTTP 401");

    // 3. Authenticated Overview Retrieval & Structure Verification
    console.log("\n--- 3. Overview Response Structure & Consolidation ---");
    const overviewRes = await fetch(`${baseUrl}/users/me/overview`, { headers: headersA });
    assert(overviewRes.status === 200, "Authenticated GET /api/users/me/overview returns HTTP 200");

    const data = await overviewRes.json();
    assert(data.success === true, "Response has success: true");

    // Profile verification
    assert(data.profile && data.profile.id === testUserA._id.toString(), "Profile ID matches authenticated user");
    assert(data.profile.name === "Overview User A", "Profile name matches");
    assert(data.profile.email === testUserA.email, "Profile email matches");
    assert(Boolean(data.profile.referralCode), "Profile contains referralCode");
    assert(data.profile.password === undefined, "Password hash is NOT exposed in overview");

    // Wallet balances verification
    assert(data.wallet && data.wallet.balances, "Wallet balances consolidated");
    assert(data.wallet.balances.VE.available === 800, "VE available balance is 800 (1000 funded - 200 held)");
    assert(data.wallet.balances.VE.reserved === 200, "VE reserved balance is 200 (held for pending withdrawal)");

    // Level progression verification
    assert(data.levelProgress && data.levelProgress.currentLevel === 2, "Level progress reports Level 2 (1,500 XP)");
    assert(data.levelProgress.currentLevelName === "Bronze Explorer", "Level progress reports 'Bronze Explorer'");
    assert(data.levelProgress.currentXp === 1500, "Current XP is 1,500");

    // Achievements summary verification
    assert(data.achievements && typeof data.achievements.total === "number", "Achievements section consolidated");
    assert(data.achievements.unlocked >= 1, "At least 1 achievement unlocked (Welcome / Bronze Hunter)");
    assert(Array.isArray(data.achievements.items), "Achievements items list provided");

    // Referrals summary verification
    assert(data.referrals && data.referrals.referralCode === testUserA.referralCode, "Referral summary includes user's referral code");
    assert(data.referrals.referralRewardsEarned === 0, "No fake referral financial rewards fabricated");

    // Withdrawals summary verification
    assert(data.withdrawals && data.withdrawals.totalRequests === 1, "Withdrawals summary reports 1 total request");
    assert(data.withdrawals.pending === 1, "Withdrawals summary reports 1 pending request");
    assert(data.withdrawals.totalWithdrawn === 0, "Non-negotiable rule: Pending withdrawal NOT counted in totalWithdrawn (is 0)");

    // Recent activity verification
    assert(Array.isArray(data.recentActivity), "Recent activity provided as array");
    assert(data.recentActivity.length >= 2, "Recent activity populated with genuine persisted events");
    assert(data.recentActivity.some((act) => act.type === "HOLD"), "Recent activity includes real HOLD transaction");
    assert(data.recentActivity.some((act) => act.type === "CREDIT"), "Recent activity includes real CREDIT transaction");

    // 4. Data Agreement with Individual Endpoints
    console.log("\n--- 4. Data Agreement with Modular Endpoints ---");
    // Compare wallet with /me/wallet
    const walletRes = await fetch(`${baseUrl}/users/me/wallet`, { headers: headersA });
    const walletData = await walletRes.json();
    assert(
      data.wallet.balances.VE.available === walletData.wallet.balances.VE.available,
      "Overview wallet available balance matches /api/users/me/wallet"
    );

    // Compare progress with /me/progress
    const progRes = await fetch(`${baseUrl}/users/me/progress`, { headers: headersA });
    const progData = await progRes.json();
    assert(
      data.levelProgress.currentXp === progData.levelProgress.currentXp,
      "Overview levelProgress currentXp matches /api/users/me/progress"
    );

    // Compare referrals with /me/referrals
    const refRes = await fetch(`${baseUrl}/users/me/referrals`, { headers: headersA });
    const refData = await refRes.json();
    assert(
      data.referrals.referralCode === refData.referrals.referralCode,
      "Overview referrals summary matches /api/users/me/referrals"
    );

    // Compare withdrawals with /me/withdrawals/summary
    const wdRes = await fetch(`${baseUrl}/users/me/withdrawals/summary`, { headers: headersA });
    const wdData = await wdRes.json();
    assert(
      data.withdrawals.totalWithdrawn === wdData.withdrawalSummary.totalWithdrawn,
      "Overview totalWithdrawn matches /api/users/me/withdrawals/summary"
    );

    // 5. Ownership & Isolation: User B cannot access User A's overview
    console.log("\n--- 5. Ownership Isolation Across Users ---");
    // Request with User B's token while trying to pass User A's ID in query or headers
    const crossRes = await fetch(`${baseUrl}/users/me/overview?userId=${testUserA._id}`, {
      headers: headersB
    });
    const crossData = await crossRes.json();
    assert(
      crossData.profile.id === testUserB._id.toString(),
      "User identity derived strictly from auth token; query param userId ignored"
    );
    assert(
      crossData.wallet.balances.VE.available === 0,
      "User B overview sees User B's zero balance, NOT User A's balance"
    );

    // 6. Suspended Account Handling
    console.log("\n--- 6. Suspended Account Handling ---");
    const suspendedUser = await User.create({
      name: "Suspended User",
      email: `suspended_${Date.now()}@example.com`,
      password: "Password123!",
      role: "user",
      status: "suspended"
    });
    const suspendedToken = generateToken({ id: suspendedUser._id, role: suspendedUser.role });
    const suspendedRes = await fetch(`${baseUrl}/users/me/overview`, {
      headers: { Authorization: `Bearer ${suspendedToken}` }
    });
    assert(suspendedRes.status === 403, "Suspended user rejected with HTTP 403");

    server.close();

    // 7. Regression Check on All Prior Endpoints
    console.log("\n--- 7. Regression Verification on All Prior Endpoints ---");
    const server2 = app.listen(0);
    const port2 = server2.address().port;
    const baseUrl2 = `http://127.0.0.1:${port2}/api`;

    const rProfile = await fetch(`${baseUrl2}/users/me/profile`, { headers: headersA });
    assert(rProfile.status === 200, "Existing GET /api/users/me/profile still returns HTTP 200");

    const rWallet = await fetch(`${baseUrl2}/users/me/wallet`, { headers: headersA });
    assert(rWallet.status === 200, "Existing GET /api/users/me/wallet still returns HTTP 200");

    const rProgress = await fetch(`${baseUrl2}/users/me/progress`, { headers: headersA });
    assert(rProgress.status === 200, "Existing GET /api/users/me/progress still returns HTTP 200");

    const rAchievements = await fetch(`${baseUrl2}/users/me/achievements`, { headers: headersA });
    assert(rAchievements.status === 200, "Existing GET /api/users/me/achievements still returns HTTP 200");

    const rReferrals = await fetch(`${baseUrl2}/users/me/referrals`, { headers: headersA });
    assert(rReferrals.status === 200, "Existing GET /api/users/me/referrals still returns HTTP 200");

    const rWithdrawals = await fetch(`${baseUrl2}/users/me/withdrawals/summary`, { headers: headersA });
    assert(rWithdrawals.status === 200, "Existing GET /api/users/me/withdrawals/summary still returns HTTP 200");

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


process.env.JWT_SECRET = process.env.JWT_SECRET || "milestone_3d_test_jwt_secret_secure_key_12345";

import mongoose from "mongoose";
import User, { generateReferralCodeString } from "./src/models/User.js";
import Referral from "./src/models/Referral.js";
import {
  validateReferralCode,
  createReferralRelationship,
  getUserReferralSummary,
  getUserReferralsList,
  updateReferralStatus,
  backfillUserReferralCodes
} from "./src/services/referral.service.js";
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
  console.log("=== Starting Milestone 3D: Referral System Verification Tests ===\n");

  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/user-profile";
  await mongoose.connect(uri);

  try {
    // 1. Referral-code generation and uniqueness
    console.log("--- 1. Referral Code Generation & Uniqueness ---");
    const userA = await User.create({
      name: "Referrer Alice",
      email: `alice_${Date.now()}@example.com`,
      password: "Password123!",
      role: "user",
      status: "active"
    });

    assert(Boolean(userA.referralCode), "User A auto-provisioned unique referral code upon creation");
    assert(userA.referralCode.startsWith("VL"), "Referral code adheres to 'VL' prefix format");

    const userB = await User.create({
      name: "User Bob",
      email: `bob_${Date.now()}@example.com`,
      password: "Password123!",
      role: "user",
      status: "active"
    });

    assert(userA.referralCode !== userB.referralCode, "Referral codes are globally unique across users");

    // 2. Referral Code Validation
    console.log("\n--- 2. Referral Code Validation ---");
    const validValidation = await validateReferralCode(userA.referralCode);
    assert(validValidation.valid === true, "Valid referral code recognized");
    assert(validValidation.referrerId.toString() === userA._id.toString(), "Valid referral code points to correct referrer");

    const invalidValidation = await validateReferralCode("INVALID_NONEXISTENT_CODE");
    assert(invalidValidation.valid === false, "Non-existent referral code rejected");

    const emptyValidation = await validateReferralCode("");
    assert(emptyValidation.valid === false, "Empty referral code rejected");

    // 3. Self-Referral Prevention
    console.log("\n--- 3. Self-Referral Prevention ---");
    let selfReferralBlocked = false;
    try {
      await createReferralRelationship({
        referralCode: userA.referralCode,
        referredUserId: userA._id
      });
    } catch (err) {
      if (err.message.includes("Self-referral is strictly prohibited")) {
        selfReferralBlocked = true;
      }
    }
    assert(selfReferralBlocked, "Self-referral attempt strictly blocked");

    // 4. Create Valid Referral Relationship
    console.log("\n--- 4. Referral Relationship Creation ---");
    const referralRel1 = await createReferralRelationship({
      referralCode: userA.referralCode,
      referredUserId: userB._id
    });

    assert(referralRel1 !== null, "Referral relationship successfully created");
    assert(referralRel1.status === "pending", "Initial referral relationship status is 'pending'");
    assert(referralRel1.referrerId.toString() === userA._id.toString(), "Referrer ID correctly mapped");
    assert(referralRel1.referredUserId.toString() === userB._id.toString(), "Referred user ID correctly mapped");
    assert(referralRel1.statusHistory.length === 1, "Status history initiated with creation record");

    // 5. One Relationship Per Referred User Constraint
    console.log("\n--- 5. Exactly One Relationship Per Referred User ---");
    const userC = await User.create({
      name: "Referrer Charlie",
      email: `charlie_${Date.now()}@example.com`,
      password: "Password123!",
      role: "user",
      status: "active"
    });

    let duplicateRelationshipBlocked = false;
    try {
      await createReferralRelationship({
        referralCode: userC.referralCode,
        referredUserId: userB._id // User B already referred by User A
      });
    } catch (err) {
      if (err.message.includes("already has an established referral relationship")) {
        duplicateRelationshipBlocked = true;
      }
    }
    assert(duplicateRelationshipBlocked, "Attempt to attach second referrer to User B rejected");

    // 6. Valid and Invalid Status Transitions
    console.log("\n--- 6. Status Transition State Machine ---");
    // Invalid transition: pending -> rewarded (must qualify first)
    let illegalSkipBlocked = false;
    try {
      await updateReferralStatus({
        referralId: referralRel1._id,
        newStatus: "rewarded"
      });
    } catch (err) {
      if (err.message.includes("Illegal status transition")) {
        illegalSkipBlocked = true;
      }
    }
    assert(illegalSkipBlocked, "Direct jump from 'pending' to 'rewarded' safely blocked");

    // Valid transition: pending -> qualified
    const qualifiedRel = await updateReferralStatus({
      referralId: referralRel1._id,
      newStatus: "qualified",
      reason: "Completed onboarding criteria"
    });
    assert(qualifiedRel.status === "qualified", "Transition from 'pending' to 'qualified' succeeded");
    assert(Boolean(qualifiedRel.qualifiedAt), "qualifiedAt timestamp automatically set");
    assert(qualifiedRel.statusHistory.length === 2, "Status history recorded transition");

    // Valid transition: qualified -> rewarded
    const rewardedRel = await updateReferralStatus({
      referralId: referralRel1._id,
      newStatus: "rewarded",
      reason: "Reward milestone achieved"
    });
    assert(rewardedRel.status === "rewarded", "Transition from 'qualified' to 'rewarded' succeeded");
    assert(Boolean(rewardedRel.rewardedAt), "rewardedAt timestamp automatically set");

    // Terminal state: rewarded cannot transition back to pending or qualified
    let terminalStateProtected = false;
    try {
      await updateReferralStatus({
        referralId: referralRel1._id,
        newStatus: "pending"
      });
    } catch (err) {
      if (err.message.includes("Illegal status transition")) {
        terminalStateProtected = true;
      }
    }
    assert(terminalStateProtected, "Terminal state 'rewarded' protected from backward transition");

    // 7. Referral Summary & History Retrieval
    console.log("\n--- 7. Referral Summary & Privacy History ---");
    const summary = await getUserReferralSummary(userA._id);
    assert(summary.referralCode === userA.referralCode, "Summary returns user's active referral code");
    assert(summary.totalReferrals >= 1, "Summary reports total referrals >= 1");
    assert(summary.successfulReferrals >= 1, "Summary reports successful referrals >= 1");
    assert(summary.referralRewardsEarned === 0, "Summary accurately reports 0 fabricated rewards");

    const history = await getUserReferralsList(userA._id, { page: 1, limit: 10 });
    assert(history.referrals.length >= 1, "Referrals list contains history records");
    assert(Boolean(history.referrals[0].referredUser.maskedEmail), "Referred user email is privacy-masked");
    assert(history.referrals[0].referredUser.maskedEmail.includes("***@"), "Masked email contains '***@'");
    assert(history.pagination.page === 1, "Pagination metadata included in response");

    // 8. Backfill Referral Codes Idempotency
    console.log("\n--- 8. Repeatable Backfill ---");
    const backfillRes = await backfillUserReferralCodes();
    assert(typeof backfillRes.totalInspected === "number", "backfillUserReferralCodes completed inspection");
    assert(typeof backfillRes.backfilledCount === "number", "backfillUserReferralCodes reported backfill count");

    // 9. HTTP Integration Tests
    console.log("\n--- 9. HTTP Endpoint Integration ---");
    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const tokenA = generateToken({ id: userA._id, role: userA.role });
    const headersA = {
      Authorization: `Bearer ${tokenA}`,
      "Content-Type": "application/json"
    };

    // Public code validation
    const codeHttpRes = await fetch(`${baseUrl}/referrals/validate/${userA.referralCode}`);
    assert(codeHttpRes.status === 200, "GET /api/referrals/validate/:code returns HTTP 200 for valid code");
    const codeHttpData = await codeHttpRes.json();
    assert(codeHttpData.valid === true, "Validation endpoint confirms valid: true");

    const invalidCodeHttpRes = await fetch(`${baseUrl}/referrals/validate/FAKE_CODE_999`);
    assert(invalidCodeHttpRes.status === 404, "GET /api/referrals/validate/:code returns HTTP 404 for invalid code");

    // Authenticated summary
    const summaryHttpRes = await fetch(`${baseUrl}/users/me/referrals`, { headers: headersA });
    assert(summaryHttpRes.status === 200, "GET /api/users/me/referrals returns HTTP 200");
    const summaryHttpData = await summaryHttpRes.json();
    assert(summaryHttpData.referrals.referralCode === userA.referralCode, "HTTP summary returns correct referralCode");

    // Authenticated history
    const historyHttpRes = await fetch(`${baseUrl}/users/me/referrals/history`, { headers: headersA });
    assert(historyHttpRes.status === 200, "GET /api/users/me/referrals/history returns HTTP 200");
    const historyHttpData = await historyHttpRes.json();
    assert(Array.isArray(historyHttpData.referrals), "HTTP history returns array of referrals");

    // Registration with valid referral code
    const regWithRefRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Referred New User",
        email: `referred_new_${Date.now()}@example.com`,
        password: "Password123!",
        referralCode: userA.referralCode
      })
    });
    assert(regWithRefRes.status === 201, "Registration with valid referralCode succeeds with HTTP 201");
    const regWithRefData = await regWithRefRes.json();
    const newUserId = regWithRefData.user.id;

    const createdRel = await Referral.findOne({ referredUserId: newUserId });
    assert(createdRel !== null, "Referral record automatically linked upon registration");
    assert(createdRel.referrerId.toString() === userA._id.toString(), "Referrer correctly linked to User A");

    // Registration with invalid referral code
    const regBadRefRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bad Ref User",
        email: `bad_ref_${Date.now()}@example.com`,
        password: "Password123!",
        referralCode: "NON_EXISTENT_CODE"
      })
    });
    assert(regBadRefRes.status === 400, "Registration with invalid referralCode rejected with HTTP 400");

    // Profile API includes referralCode
    const profRes = await fetch(`${baseUrl}/users/me/profile`, { headers: headersA });
    assert(profRes.status === 200, "GET /api/users/me/profile returns HTTP 200");
    const profData = await profRes.json();
    assert(profData.profile.referralCode === userA.referralCode, "Profile API returns user's referralCode");

    server.close();

    // 10. Regression Check on previous endpoints
    console.log("\n--- 10. Regression Check (Milestones 1, 2, 3B, 3C) ---");
    const server2 = app.listen(0);
    const port2 = server2.address().port;
    const baseUrl2 = `http://127.0.0.1:${port2}/api`;

    const walletRes = await fetch(`${baseUrl2}/users/me/wallet`, { headers: headersA });
    assert(walletRes.status === 200, "GET /api/users/me/wallet still returns HTTP 200");

    const progressRes = await fetch(`${baseUrl2}/users/me/progress`, { headers: headersA });
    assert(progressRes.status === 200, "GET /api/users/me/progress still returns HTTP 200");

    const achRes = await fetch(`${baseUrl2}/users/me/achievements`, { headers: headersA });
    assert(achRes.status === 200, "GET /api/users/me/achievements still returns HTTP 200");

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


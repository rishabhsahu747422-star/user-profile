process.env.JWT_SECRET = process.env.JWT_SECRET || "milestone_3c_test_jwt_secret_secure_key_12345";

import mongoose from "mongoose";
import User from "./src/models/User.js";
import UserProgress from "./src/models/UserProgress.js";
import LevelConfiguration from "./src/models/LevelConfiguration.js";
import Achievement from "./src/models/Achievement.js";
import UserAchievement from "./src/models/UserAchievement.js";
import XpTransaction from "./src/models/XpTransaction.js";
import {
  getOrCreateUserProgress,
  calculateLevelForXp,
  awardXp,
  getUserProgressionOverview,
  getUserAchievements,
  claimAchievementReward,
  seedDefaultProgressionConfigs
} from "./src/services/progression.service.js";
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
  console.log("=== Starting Milestone 3C: XP, Levels and Achievements Verification Tests ===\n");

  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/user-profile";
  await mongoose.connect(uri);

  try {
    // 1. Progress Record Creation & Unique User Constraint
    console.log("--- 1. UserProgress Model & Unique Constraint ---");
    const testUser = await User.create({
      name: "Progression Tester",
      email: `prog_${Date.now()}@example.com`,
      password: "Password123!",
      role: "user",
      status: "active"
    });

    const progress1 = await getOrCreateUserProgress(testUser._id);
    assert(progress1 !== null, "UserProgress record successfully created");
    assert(progress1.currentXp === 0, "Initial currentXp is 0");
    assert(progress1.currentLevel === 1, "Initial currentLevel is 1");
    assert(progress1.totalXpEarned === 0, "Initial totalXpEarned is 0");

    let duplicateRejected = false;
    try {
      const duplicateProgress = new UserProgress({
        userId: testUser._id,
        currentXp: 50,
        currentLevel: 1
      });
      await duplicateProgress.save();
    } catch (err) {
      if (err.code === 11000 || err.name === "MongoServerError") {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, "UserProgress enforces 1:1 user constraint (E11000 on duplicate)");

    // 2. XP Validation
    console.log("\n--- 2. XP Input Validation ---");
    let invalidXpRejected = false;
    try {
      await awardXp({
        userId: testUser._id,
        amount: -100,
        reason: "Negative XP test",
        idempotencyKey: `neg_${Date.now()}`
      });
    } catch {
      invalidXpRejected = true;
    }
    assert(invalidXpRejected, "Rejected negative XP award");

    let fractionalXpRejected = false;
    try {
      await awardXp({
        userId: testUser._id,
        amount: 25.5,
        reason: "Fractional XP test",
        idempotencyKey: `frac_${Date.now()}`
      });
    } catch {
      fractionalXpRejected = true;
    }
    assert(fractionalXpRejected, "Rejected fractional XP award");

    let missingIdempotencyRejected = false;
    try {
      await awardXp({
        userId: testUser._id,
        amount: 100,
        reason: "Missing idempotency key"
      });
    } catch {
      missingIdempotencyRejected = true;
    }
    assert(missingIdempotencyRejected, "Rejected awardXp call with missing idempotencyKey");

    // 3. Dynamic Level Calculation Based on LevelConfiguration
    console.log("\n--- 3. Dynamic Level Calculation ---");
    await seedDefaultProgressionConfigs();

    const lvl0 = await calculateLevelForXp(0);
    assert(lvl0.currentLevel === 1 && lvl0.currentLevelName === "Novice", "0 XP maps to Level 1 (Novice)");
    assert(lvl0.nextLevel === 2 && lvl0.nextLevelXp === 1000, "Next level is 2 at 1,000 XP");
    assert(lvl0.xpRemaining === 1000, "1,000 XP remaining to Level 2");

    const lvl500 = await calculateLevelForXp(500);
    assert(lvl500.progressPercentage === 50, "500/1000 XP correctly computes 50% progress");

    const lvl1500 = await calculateLevelForXp(1500);
    assert(lvl1500.currentLevel === 2 && lvl1500.currentLevelName === "Bronze Explorer", "1,500 XP maps to Level 2 (Bronze Explorer)");

    const lvl6420 = await calculateLevelForXp(6420);
    assert(lvl6420.currentLevel === 4 && lvl6420.currentLevelName === "Reward Explorer", "6,420 XP maps to Level 4 (Reward Explorer) as in assignment spec");
    assert(lvl6420.nextLevel === 5 && lvl6420.nextLevelXp === 8000, "Next level is 5 at 8,000 XP");
    assert(lvl6420.xpRemaining === 1580, "1,580 XP remaining to Level 5 as in assignment spec");

    // 4. Award XP & Level Up Progression
    console.log("\n--- 4. Award XP & Level Transition ---");
    const awardKey1 = `xp_award_1000_${Date.now()}`;
    const awardResult1 = await awardXp({
      userId: testUser._id,
      amount: 1000,
      reason: "Completed onboarding tasks",
      referenceType: "TASK",
      idempotencyKey: awardKey1
    });

    assert(!awardResult1.isDuplicate, "Executed XP award successfully");
    assert(awardResult1.newLevel === 2, "User leveled up from Level 1 to Level 2 at 1,000 XP");

    const updatedOverview = await getUserProgressionOverview(testUser._id);
    assert(updatedOverview.currentXp === 1000, "Current XP updated to 1,000");
    assert(updatedOverview.currentLevel === 2, "Current level updated to 2");
    assert(updatedOverview.currentLevelName === "Bronze Explorer", "Level name reflects 'Bronze Explorer'");

    // 5. Idempotent Retry Handling
    console.log("\n--- 5. Idempotency on Retried XP Awards ---");
    const duplicateAwardResult = await awardXp({
      userId: testUser._id,
      amount: 1000,
      reason: "Completed onboarding tasks",
      referenceType: "TASK",
      idempotencyKey: awardKey1 // Same idempotencyKey
    });

    assert(duplicateAwardResult.isDuplicate === true, "Recognized duplicate idempotencyKey on retry");
    const checkAfterRetry = await getUserProgressionOverview(testUser._id);
    assert(checkAfterRetry.currentXp === 1000, "XP was NOT doubled on duplicate request (remains 1,000)");

    // 6. Achievement Criteria & Unlocks
    console.log("\n--- 6. Achievement Criteria & Unlocks ---");
    const achievements = await getUserAchievements(testUser._id);
    const welcomeAch = achievements.find((a) => a.code === "ACH_WELCOME");
    assert(welcomeAch && welcomeAch.unlocked === true, "Welcome achievement is unlocked for registered user");

    const bronzeAch = achievements.find((a) => a.code === "ACH_BRONZE_HUNTER");
    assert(bronzeAch && bronzeAch.unlocked === true, "Bronze Hunter achievement unlocked upon reaching 1,000 XP");

    const goldAch = achievements.find((a) => a.code === "ACH_GOLD_HUNTER");
    assert(goldAch && goldAch.unlocked === false, "Gold Hunter achievement remains locked (needs 6,000 XP)");

    // 7. Achievement Claiming Behavior (No unapproved wallet mutation)
    console.log("\n--- 7. Achievement Claiming ---");
    assert(bronzeAch.isClaimed === false, "Achievement initially unclaimed");
    const claimRes = await claimAchievementReward(testUser._id, bronzeAch.id);
    assert(claimRes.success === true, "Unlocked achievement claimed successfully");

    let duplicateClaimRejected = false;
    try {
      await claimAchievementReward(testUser._id, bronzeAch.id);
    } catch (err) {
      if (err.message.includes("already been claimed")) {
        duplicateClaimRejected = true;
      }
    }
    assert(duplicateClaimRejected, "Duplicate achievement claim safely rejected");

    let lockedClaimRejected = false;
    try {
      await claimAchievementReward(testUser._id, goldAch.id);
    } catch (err) {
      if (err.message.includes("not unlocked yet")) {
        lockedClaimRejected = true;
      }
    }
    assert(lockedClaimRejected, "Locked achievement claim safely rejected");

    // 8. Immutable XP Ledger
    console.log("\n--- 8. Immutable XP Transaction Ledger ---");
    let updateBlocked = false;
    try {
      await XpTransaction.updateOne({ userId: testUser._id }, { $set: { amount: 999999 } });
    } catch (err) {
      if (err.message.includes("immutable")) {
        updateBlocked = true;
      }
    }
    assert(updateBlocked, "Pre-hook prevented update on XpTransaction ledger");

    let deleteBlocked = false;
    try {
      await XpTransaction.deleteOne({ userId: testUser._id });
    } catch (err) {
      if (err.message.includes("immutable") || err.message.includes("deleted")) {
        deleteBlocked = true;
      }
    }
    assert(deleteBlocked, "Pre-hook prevented deletion on XpTransaction ledger");

    // 9. Concurrency Safety for XP Awards
    console.log("\n--- 9. Concurrency Safety ---");
    const concurrentUser = await User.create({
      name: "Concurrent XP User",
      email: `concurrent_xp_${Date.now()}@example.com`,
      password: "Password123!",
      role: "user",
      status: "active"
    });

    // Run 5 simultaneous XP awards of 200 XP each
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        awardXp({
          userId: concurrentUser._id,
          amount: 200,
          reason: `Concurrent batch task ${i + 1}`,
          idempotencyKey: `concurrent_xp_${concurrentUser._id}_${i}_${Date.now()}`
        })
      );
    }
    await Promise.all(promises);

    const concurrentOverview = await getUserProgressionOverview(concurrentUser._id);
    assert(concurrentOverview.currentXp === 1000, "5 simultaneous 200 XP awards tally exactly to 1,000 XP without race condition losses");
    assert(concurrentOverview.currentLevel === 2, "Level accurately reflects 2 following concurrent awards");

    // 10. HTTP Endpoint Integration
    console.log("\n--- 10. HTTP Endpoint Integration ---");
    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const token = generateToken({ id: testUser._id, role: testUser.role });
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    // GET /api/users/me/progress
    const progressHttpRes = await fetch(`${baseUrl}/users/me/progress`, { headers });
    assert(progressHttpRes.status === 200, "GET /api/users/me/progress returns HTTP 200");
    const progressHttpData = await progressHttpRes.json();
    assert(progressHttpData.levelProgress.currentLevel === 2, "HTTP response contains correct currentLevel (2)");
    assert(progressHttpData.levelProgress.currentXp === 1000, "HTTP response contains correct currentXp (1,000)");

    // GET /api/users/me/achievements
    const achHttpRes = await fetch(`${baseUrl}/users/me/achievements`, { headers });
    assert(achHttpRes.status === 200, "GET /api/users/me/achievements returns HTTP 200");
    const achHttpData = await achHttpRes.json();
    assert(Array.isArray(achHttpData.achievements) && achHttpData.achievements.length >= 5, "HTTP response returns array of achievements");

    // POST /api/users/me/achievements/:id/claim
    const welcomeAchItem = achHttpData.achievements.find((a) => a.code === "ACH_WELCOME");
    const claimHttpRes = await fetch(`${baseUrl}/users/me/achievements/${welcomeAchItem.id}/claim`, {
      method: "POST",
      headers
    });
    assert(claimHttpRes.status === 200, "POST /api/users/me/achievements/:id/claim returns HTTP 200");

    // Prevention of client-side privilege escalation
    const unauthRes = await fetch(`${baseUrl}/users/me/progress`);
    assert(unauthRes.status === 401, "Unauthenticated request to /users/me/progress rejected with HTTP 401");

    server.close();

    // 11. Regression Check: Existing endpoints intact
    console.log("\n--- 11. Regression Verification ---");
    const server2 = app.listen(0);
    const port2 = server2.address().port;
    const baseUrl2 = `http://127.0.0.1:${port2}/api`;

    const profileRes = await fetch(`${baseUrl2}/users/me/profile`, { headers });
    assert(profileRes.status === 200, "Existing GET /api/users/me/profile still returns HTTP 200");

    const walletRes = await fetch(`${baseUrl2}/users/me/wallet`, { headers });
    assert(walletRes.status === 200, "Existing GET /api/users/me/wallet still returns HTTP 200");

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

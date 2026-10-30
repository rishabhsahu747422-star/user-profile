import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import UserProgress from "../models/UserProgress.js";
import Achievement from "../models/Achievement.js";
import UserAchievement from "../models/UserAchievement.js";
import Referral from "../models/Referral.js";
import Withdrawal from "../models/Withdrawal.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import {
  seedDefaultProgressionConfigs,
  awardXp
} from "../services/progression.service.js";
import {
  executeCredit,
  holdBalance,
  settleHold,
  reconcileWallet
} from "../services/wallet.service.js";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/user_profile_db";

export const seedDatabase = async () => {
  console.log("Connecting to MongoDB for database seeding...");
  await mongoose.connect(MONGO_URI);

  console.log("Seeding default levels and achievements...");
  await seedDefaultProgressionConfigs();

  // 1. Seed or update Demo Administrator
  console.log("Seeding Demo Administrator...");
  let admin = await User.findOne({ email: "demo-admin@example.com" });
  if (!admin) {
    admin = new User({
      name: "Demo Administrator",
      email: "demo-admin@example.com",
      password: "AdminPassword123!",
      role: "admin",
      status: "active",
      referralCode: "ADMIN2026"
    });
    await admin.save();
    console.log("Created demo admin account: demo-admin@example.com");
  } else {
    admin.role = "admin";
    admin.status = "active";
    admin.password = "AdminPassword123!";
    await admin.save();
    console.log("Updated demo admin account: demo-admin@example.com");
  }

  // 2. Seed or update Demo User
  console.log("Seeding Demo User...");
  let demoUser = await User.findOne({ email: "demo-user@example.com" });
  if (!demoUser) {
    demoUser = new User({
      name: "Alex Mercer",
      email: "demo-user@example.com",
      password: "UserPassword123!",
      role: "user",
      status: "active",
      referralCode: "DEMO2026"
    });
    await demoUser.save();
    console.log("Created demo user account: demo-user@example.com");
  } else {
    demoUser.status = "active";
    demoUser.password = "UserPassword123!";
    await demoUser.save();
    console.log("Updated demo user account: demo-user@example.com");
  }

  // 3. Setup progression for Demo User
  console.log("Setting up progression for Demo User...");
  let progress = await UserProgress.findOne({ userId: demoUser._id });
  if (!progress || progress.currentXp < 1500) {
    await awardXp({
      userId: demoUser._id,
      amount: 1500,
      reason: "Initial onboarding and challenge completion",
      source: "ONBOARDING",
      idempotencyKey: `seed_xp_${demoUser._id}`
    });
  }

  // 4. Seed Wallet Balances & Ledger for Demo User
  console.log("Setting up multi-asset wallet for Demo User...");
  let wallet = await Wallet.findOne({ userId: demoUser._id });
  const txCount = await WalletTransaction.countDocuments({ userId: demoUser._id });

  if (!wallet || txCount === 0) {
    if (wallet) {
      wallet.balances = {
        VE: { available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 },
        SVE: { available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 },
        GEM: { available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 },
        TOKEN: { available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 }
      };
      await wallet.save();
    }

    // Credit VE
    await executeCredit({
      userId: demoUser._id,
      assetType: "VE",
      amount: 3000,
      reason: "Welcome Reward & Initial Earnings",
      idempotencyKey: `seed_credit_ve_${demoUser._id}`
    });

    // Credit SVE
    await executeCredit({
      userId: demoUser._id,
      assetType: "SVE",
      amount: 150,
      reason: "Staking Reward",
      idempotencyKey: `seed_credit_sve_${demoUser._id}`
    });

    // Credit GEM
    await executeCredit({
      userId: demoUser._id,
      assetType: "GEM",
      amount: 50,
      reason: "Achievement Gems",
      idempotencyKey: `seed_credit_gem_${demoUser._id}`
    });

    // Credit TOKEN
    await executeCredit({
      userId: demoUser._id,
      assetType: "TOKEN",
      amount: 10,
      reason: "Community Token Drop",
      idempotencyKey: `seed_credit_tok_${demoUser._id}`
    });

    // 5. Simulate a settled withdrawal (500 VE)
    await holdBalance({
      userId: demoUser._id,
      assetType: "VE",
      amount: 500,
      reason: "Settled Withdrawal Request",
      idempotencyKey: `seed_hold_settle_${demoUser._id}`
    });

    await settleHold({
      userId: demoUser._id,
      assetType: "VE",
      amount: 500,
      reason: "Settled Bank Transfer Withdrawal",
      idempotencyKey: `seed_settle_${demoUser._id}`
    });

    await Withdrawal.create({
      userId: demoUser._id,
      amount: 500,
      assetType: "VE",
      payoutMethod: "BANK_TRANSFER",
      payoutDetails: {
        accountIdentifier: "CHASUS33-4821"
      },
      status: "completed",
      idempotencyKey: `seed_with_completed_${demoUser._id}`,
      reviewedBy: admin._id,
      reviewedAt: new Date(Date.now() - 86400000 * 3),
      completedAt: new Date(Date.now() - 86400000 * 2)
    });

    // 6. Simulate a pending withdrawal (200 VE reserved)
    await holdBalance({
      userId: demoUser._id,
      assetType: "VE",
      amount: 200,
      reason: "Pending Withdrawal Request",
      idempotencyKey: `seed_hold_pending_${demoUser._id}`
    });

    await Withdrawal.create({
      userId: demoUser._id,
      amount: 200,
      assetType: "VE",
      payoutMethod: "CRYPTO",
      payoutDetails: {
        accountIdentifier: "0x71C8A9...39A2"
      },
      status: "pending",
      idempotencyKey: `seed_with_pending_${demoUser._id}`
    });
  }

  // 7. Seed Achievements for Demo User
  console.log("Unlocking achievements for Demo User...");
  const welcomeAch = await Achievement.findOne({ code: "ACH_WELCOME" });
  if (welcomeAch) {
    const existingUA = await UserAchievement.findOne({
      userId: demoUser._id,
      achievementId: welcomeAch._id
    });
    if (!existingUA) {
      await UserAchievement.create({
        userId: demoUser._id,
        achievementId: welcomeAch._id,
        isUnlocked: true,
        unlockedAt: new Date(Date.now() - 86400000 * 7),
        isClaimed: true,
        claimedAt: new Date(Date.now() - 86400000 * 7)
      });
    }
  }

  const bronzeAch = await Achievement.findOne({ code: "ACH_BRONZE_HUNTER" });
  if (bronzeAch) {
    const existingUA = await UserAchievement.findOne({
      userId: demoUser._id,
      achievementId: bronzeAch._id
    });
    if (!existingUA) {
      await UserAchievement.create({
        userId: demoUser._id,
        achievementId: bronzeAch._id,
        isUnlocked: true,
        unlockedAt: new Date(Date.now() - 86400000 * 2),
        isClaimed: false
      });
    }
  }

  // 8. Seed Referrals for Demo User
  console.log("Seeding sample referrals for Demo User...");
  let referredUser = await User.findOne({ email: "sarah.connor@example.com" });
  if (!referredUser) {
    referredUser = new User({
      name: "Sarah Connor",
      email: "sarah.connor@example.com",
      password: "Password123!",
      role: "user",
      status: "active"
    });
    await referredUser.save();

    await Referral.create({
      referrerId: demoUser._id,
      referredUserId: referredUser._id,
      referralCode: "DEMO2026",
      status: "qualified",
      qualifiedAt: new Date(Date.now() - 86400000)
    });
  }

  // 9. Reconcile Demo User's Wallet
  console.log("Verifying wallet reconciliation for Demo User...");
  const recon = await reconcileWallet(demoUser._id);
  if (!recon.isReconciled) {
    console.error("Discrepancies found in seeded demo user wallet:", recon.discrepancies);
  } else {
    console.log("Demo user wallet reconciled 100% against ledger.");
  }

  console.log("\n=======================================================");
  console.log("DATABASE SEEDING COMPLETE");
  console.log("Demo Administrator Credentials:");
  console.log("  Email:    demo-admin@example.com");
  console.log("  Password: AdminPassword123!");
  console.log("Demo Regular User Credentials:");
  console.log("  Email:    demo-user@example.com");
  console.log("  Password: UserPassword123!");
  console.log("=======================================================\n");

  await mongoose.disconnect();
};

if (process.argv[1]?.endsWith("seed.js")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal seeding error:", err);
      process.exit(1);
    });
}

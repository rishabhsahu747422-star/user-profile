import mongoose from "mongoose";
import User from "./src/models/User.js";
import Wallet from "./src/models/Wallet.js";
import WalletTransaction from "./src/models/WalletTransaction.js";
import {
  getOrCreateWallet,
  executeCredit,
  executeDebit,
  reconcileWallet,
  backfillWallets,
  isTransactionSupported
} from "./src/services/wallet.service.js";

const BASE_URL = "http://localhost:5173/api";
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

async function runMilestone3BTests() {
  console.log("=== Starting Milestone 3B: Core Wallet & Ledger Verification Tests ===\n");

  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/user-profile";
  await mongoose.connect(mongoUri);

  const timestamp = Date.now();
  const testUser = await User.create({
    name: "Wallet Tester",
    email: `wallettour_${timestamp}@example.com`,
    password: "Password123!",
    role: "user",
    status: "active"
  });

  console.log(`--- Section 1: Standalone MongoDB Tests (Topology: Standalone) ---`);
  const isRS = isTransactionSupported();
  assert(!isRS, "Confirmed active MongoDB connection on 27017 is Standalone (isTransactionSupported: false)");

  // 1. Zero-balance provisioning
  const wallet1 = await getOrCreateWallet(testUser._id);
  assert(Boolean(wallet1), "Wallet successfully provisioned");
  assert(wallet1.balances.VE.available === 0, "Initial VE balance is 0");
  assert(wallet1.balances.SVE.available === 0, "Initial SVE balance is 0");
  assert(wallet1.balances.GEM.available === 0, "Initial GEM balance is 0");
  assert(wallet1.balances.TOKEN.available === 0, "Initial TOKEN balance is 0");
  assert(wallet1.balances.VE.reserved === 0, "Initial VE reserved balance is 0");

  // 2. Wallet uniqueness
  try {
    const duplicateWallet = new Wallet({
      userId: testUser._id,
      balances: wallet1.balances
    });
    await duplicateWallet.save();
    assert(false, "Duplicate wallet for same user was unexpectedly allowed");
  } catch (err) {
    assert(err.code === 11000, "Wallet uniqueness enforced: Duplicate wallet rejected with E11000");
  }

  // 3. Credit validation
  try {
    await executeCredit({
      userId: testUser._id,
      assetType: "INVALID_COIN",
      amount: 100,
      reason: "Test",
      idempotencyKey: `invalid_${timestamp}`
    });
    assert(false, "Invalid asset was unexpectedly accepted");
  } catch (err) {
    assert(err.message.includes("Unsupported asset type"), "Rejected invalid asset type");
  }

  try {
    await executeCredit({
      userId: testUser._id,
      assetType: "VE",
      amount: -50,
      reason: "Test",
      idempotencyKey: `neg_${timestamp}`
    });
    assert(false, "Negative amount was unexpectedly accepted");
  } catch (err) {
    assert(err.message.includes("Amount must be a positive integer"), "Rejected negative credit amount");
  }

  // 4. Successful Credit
  const creditRes1 = await executeCredit({
    userId: testUser._id,
    assetType: "VE",
    amount: 500,
    reason: "Initial test grant",
    idempotencyKey: `credit_500_${timestamp}`,
    actor: { id: testUser._id, role: "user", type: "USER" }
  });
  assert(!creditRes1.isDuplicate, "Initial credit marked as new execution");
  assert(creditRes1.transaction.balanceBefore === 0, "Balance before credit was 0");
  assert(creditRes1.transaction.balanceAfter === 500, "Balance after credit is 500");

  const walletAfterCredit = await Wallet.findOne({ userId: testUser._id });
  assert(walletAfterCredit.balances.VE.available === 500, "Wallet available balance reflects 500");
  assert(walletAfterCredit.balances.VE.totalEarned === 500, "Wallet totalEarned reflects 500");

  // 5. Idempotent Retry
  const creditRetry = await executeCredit({
    userId: testUser._id,
    assetType: "VE",
    amount: 500,
    reason: "Initial test grant retry",
    idempotencyKey: `credit_500_${timestamp}`
  });
  assert(creditRetry.isDuplicate === true, "Idempotent duplicate request recognized");
  assert(creditRetry.transaction.idempotencyKey === `credit_500_${timestamp}`, "Returned existing transaction record");
  
  const walletAfterRetry = await Wallet.findOne({ userId: testUser._id });
  assert(walletAfterRetry.balances.VE.available === 500, "Wallet balance was NOT duplicated on retry");

  // 6. Insufficient-Balance Rejection
  try {
    await executeDebit({
      userId: testUser._id,
      assetType: "VE",
      amount: 9999,
      reason: "Overdraft attempt",
      idempotencyKey: `overdraft_${timestamp}`
    });
    assert(false, "Overdraft debit was unexpectedly allowed");
  } catch (err) {
    assert(err.message.includes("Insufficient available VE balance"), "Rejected overdraft debit");
  }
  const walletAfterOverdraft = await Wallet.findOne({ userId: testUser._id });
  assert(walletAfterOverdraft.balances.VE.available === 500, "Balance remains intact after failed debit");

  // 7. Successful Debit
  const debitRes1 = await executeDebit({
    userId: testUser._id,
    assetType: "VE",
    amount: 150,
    reason: "Test redemption debit",
    idempotencyKey: `debit_150_${timestamp}`
  });
  assert(!debitRes1.isDuplicate, "Debit transaction executed");
  assert(debitRes1.transaction.amount === -150, "Debit amount signed as -150");
  assert(debitRes1.transaction.balanceAfter === 350, "Balance after debit is 350");

  const walletAfterDebit = await Wallet.findOne({ userId: testUser._id });
  assert(walletAfterDebit.balances.VE.available === 350, "Wallet balance decreased to 350");

  // 8. Concurrent Debit Protection (Race condition test)
  console.log("Testing concurrent debits...");
  const debitPromises = [
    executeDebit({
      userId: testUser._id,
      assetType: "VE",
      amount: 250,
      reason: "Concurrent debit A",
      idempotencyKey: `race_A_${timestamp}`
    }).then(() => "SUCCESS_A").catch((e) => `FAIL_A: ${e.message}`),
    executeDebit({
      userId: testUser._id,
      assetType: "VE",
      amount: 250,
      reason: "Concurrent debit B",
      idempotencyKey: `race_B_${timestamp}`
    }).then(() => "SUCCESS_B").catch((e) => `FAIL_B: ${e.message}`)
  ];

  const raceResults = await Promise.all(debitPromises);
  const successes = raceResults.filter((r) => r.startsWith("SUCCESS"));
  const failures = raceResults.filter((r) => r.startsWith("FAIL"));
  assert(successes.length === 1, `Exactly 1 concurrent debit succeeded out of 2 (Balance was 350, each attempted 250)`);
  assert(failures.length === 1, `The second concurrent debit was safely rejected for insufficient balance`);
  
  const walletAfterRace = await Wallet.findOne({ userId: testUser._id });
  assert(walletAfterRace.balances.VE.available === 100, "Final available balance is 100 (never negative)");

  // 9. Wallet / Ledger Reconciliation
  const recon = await reconcileWallet(testUser._id);
  assert(recon.isReconciled === true, "reconcileWallet reports 100% agreement between ledger sum and wallet balance");
  assert(recon.discrepancies.length === 0, "Zero ledger/wallet discrepancies found");

  // 10. Ledger Immutability Protection
  try {
    await WalletTransaction.updateOne({ _id: debitRes1.transaction._id }, { $set: { amount: 0 } });
    assert(false, "WalletTransaction.updateOne unexpectedly succeeded");
  } catch (err) {
    assert(err.message.includes("Wallet transactions are immutable"), "Mongoose hook prevented updateOne on ledger");
  }

  try {
    await WalletTransaction.deleteOne({ _id: debitRes1.transaction._id });
    assert(false, "WalletTransaction.deleteOne unexpectedly succeeded");
  } catch (err) {
    assert(err.message.includes("Wallet transactions are immutable"), "Mongoose hook prevented deleteOne on ledger");
  }

  // 11. Backfill service test
  const backfillRes = await backfillWallets();
  assert(backfillRes.totalUsers >= 1, `backfillWallets inspected ${backfillRes.totalUsers} users`);
  assert(typeof backfillRes.createdCount === "number", `backfillWallets report completed`);

  // 12. Regressions via HTTP API
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "New Provisioned User",
      email: `new_prov_${timestamp}@example.com`,
      password: "TestPassword123!"
    })
  });
  const regData = await regRes.json();
  const token = regData.token;
  assert(regRes.status === 201 && Boolean(token), "Registration works and issues token");

  // Verify wallet auto-provisioned upon registration
  const walletRes = await fetch(`${BASE_URL}/users/me/wallet`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const walletData = await walletRes.json();
  assert(walletRes.status === 200, "GET /api/users/me/wallet returns HTTP 200");
  assert(walletData.wallet?.balances?.VE?.available === 0, "Auto-provisioned wallet returns 0 VEs");
  assert(walletData.wallet?.balances?.GEM?.available === 0, "Auto-provisioned wallet returns 0 GEMs");

  // Profile API still works
  const profRes = await fetch(`${BASE_URL}/users/me/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(profRes.status === 200, "Existing GET /api/users/me/profile still returns HTTP 200");

  await mongoose.disconnect();

  console.log("\n=== Test Summary ===");
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runMilestone3BTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});


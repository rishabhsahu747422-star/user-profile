/**
 * Regression Test Suite: VE Loop Rewards Withdrawal API Fixes
 * Tests all 10 required scenarios from Section 4:
 *  1. Fetch withdrawal history for an authenticated user.
 *  2. Submit a valid withdrawal request.
 *  3. Reject withdrawal amount greater than available balance.
 *  4. Reject invalid or missing destination account.
 *  5. Reject zero or negative amounts.
 *  6. Prevent duplicate submissions (idempotency).
 *  7. Verify that the requested amount is reserved correctly.
 *  8. Verify that wallet balances and ledger entries remain consistent.
 *  9. Verify pending withdrawal status.
 * 10. Verify that withdrawal history refreshes/includes the newly created request.
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || "acceptance_qa_test_jwt_secret_32_chars_minimum_length";
process.env.NODE_ENV = "development";
process.env.CLIENT_URL = "http://localhost:5173,https://user-profile-azure.vercel.app";

import http from "http";
import mongoose from "mongoose";
import app from "../../src/app.js";
import User from "../../src/models/User.js";
import Wallet from "../../src/models/Wallet.js";
import WalletTransaction from "../../src/models/WalletTransaction.js";
import Withdrawal from "../../src/models/Withdrawal.js";
import { executeCredit, getOrCreateWallet, reconcileWallet } from "../../src/services/wallet.service.js";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/user-profile";

let server;
let port;
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

async function runWithdrawalTests() {
  console.log("=== Starting Withdrawal API Verification Suite ===\n");

  await mongoose.connect(MONGO_URI);
  server = app.listen(0);
  port = server.address().port;

  const timestamp = Date.now();
  let testUser;
  let userToken;

  try {
    // Setup: Register a dedicated test user
    const regRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/auth/register",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      {
        name: "Withdrawal Tester",
        email: `withdrawal_tester_${timestamp}@example.com`,
        password: "Password123!"
      }
    );
    assert(regRes.status === 201, "Setup: User registered successfully");
    userToken = regRes.data.token;
    testUser = await User.findOne({ email: `withdrawal_tester_${timestamp}@example.com` });

    // Credit user with 2,300 VE (matching user prompt scenario)
    await executeCredit({
      userId: testUser._id,
      assetType: "VE",
      amount: 2300,
      reason: "Initial test balance: 2,300 VE",
      idempotencyKey: `credit_init_${timestamp}`
    });

    const initialWallet = await getOrCreateWallet(testUser._id);
    assert(initialWallet.balances.VE.available === 2300, "Setup: Initial available balance is exactly 2,300 VE");
    assert(initialWallet.balances.VE.reserved === 0, "Setup: Initial reserved balance is 0 VE");

    // -------------------------------------------------------------
    // Scenario 1: Fetch withdrawal history for an authenticated user
    // -------------------------------------------------------------
    console.log("\n--- Scenario 1: Fetch withdrawal history ---");
    const historyRes1 = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/withdrawals",
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(historyRes1.status === 200, "Scenario 1.1: GET /api/users/me/withdrawals returns HTTP 200");
    assert(Array.isArray(historyRes1.data.withdrawals), "Scenario 1.2: Returns withdrawals array");
    assert(historyRes1.data.withdrawals.length === 0, "Scenario 1.3: Initial history is empty");
    assert(historyRes1.data.pagination && historyRes1.data.pagination.page === 1, "Scenario 1.4: Pagination metadata present");

    // Test query filter validation
    const invalidStatusRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/withdrawals?status=invalid_status",
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(invalidStatusRes.status === 400, "Scenario 1.5: Invalid status filter rejected with HTTP 400");

    const validAllStatusRes = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/withdrawals?status=all&page=1&limit=10",
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(validAllStatusRes.status === 200, "Scenario 1.6: status=all query handled cleanly with HTTP 200");

    // -------------------------------------------------------------
    // Scenario 3: Reject withdrawal amount greater than available balance
    // -------------------------------------------------------------
    console.log("\n--- Scenario 3: Reject amount greater than available balance ---");
    const overdraftRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/users/me/withdrawals",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`
        }
      },
      {
        amount: 3000, // available is 2300
        destination: "0x123abc456def",
        idempotencyKey: `wd_overdraft_${timestamp}`
      }
    );
    assert(overdraftRes.status === 400, "Scenario 3.1: Overdraft amount rejected with HTTP 400");
    assert(overdraftRes.data.message.includes("Insufficient available VE balance"), "Scenario 3.2: Error message explains insufficient balance");

    // -------------------------------------------------------------
    // Scenario 4: Reject invalid or missing destination account
    // -------------------------------------------------------------
    console.log("\n--- Scenario 4: Reject invalid or missing destination account ---");
    const missingDestRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/users/me/withdrawals",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`
        }
      },
      {
        amount: 500,
        destination: "", // Empty destination
        idempotencyKey: `wd_no_dest_${timestamp}`
      }
    );
    assert(missingDestRes.status === 400, "Scenario 4.1: Missing destination rejected with HTTP 400");
    assert(missingDestRes.data.message.includes("Destination account"), "Scenario 4.2: Error message explains missing destination");

    const omittedDestRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/users/me/withdrawals",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`
        }
      },
      {
        amount: 500,
        idempotencyKey: `wd_omitted_dest_${timestamp}`
      }
    );
    assert(omittedDestRes.status === 400, "Scenario 4.3: Omitted destination rejected with HTTP 400");

    // -------------------------------------------------------------
    // Scenario 5: Reject zero or negative amounts
    // -------------------------------------------------------------
    console.log("\n--- Scenario 5: Reject zero or negative amounts ---");
    const zeroRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/users/me/withdrawals",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`
        }
      },
      {
        amount: 0,
        destination: "0x123abc456def",
        idempotencyKey: `wd_zero_${timestamp}`
      }
    );
    assert(zeroRes.status === 400, "Scenario 5.1: Zero amount rejected with HTTP 400");

    const negativeRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/users/me/withdrawals",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`
        }
      },
      {
        amount: -100,
        destination: "0x123abc456def",
        idempotencyKey: `wd_neg_${timestamp}`
      }
    );
    assert(negativeRes.status === 400, "Scenario 5.2: Negative amount rejected with HTTP 400");

    const fractionalRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/users/me/withdrawals",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`
        }
      },
      {
        amount: 50.5,
        destination: "0x123abc456def",
        idempotencyKey: `wd_frac_${timestamp}`
      }
    );
    assert(fractionalRes.status === 400, "Scenario 5.3: Fractional amount rejected with HTTP 400");

    // -------------------------------------------------------------
    // Scenario 2: Submit a valid withdrawal request (500 VE)
    // -------------------------------------------------------------
    console.log("\n--- Scenario 2: Submit a valid withdrawal request ---");
    const validKey = `wd_valid_${timestamp}`;
    const validRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/users/me/withdrawals",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`
        }
      },
      {
        amount: 500,
        destination: "0x71C2B5f9B61191Ac8d2F97b9A4B13B",
        idempotencyKey: validKey
      }
    );
    assert(validRes.status === 201, "Scenario 2.1: Valid withdrawal request returns HTTP 201");
    assert(validRes.data.withdrawal, "Scenario 2.2: Returns created withdrawal object");
    assert(validRes.data.isDuplicate === false, "Scenario 2.3: isDuplicate is false for fresh request");

    // -------------------------------------------------------------
    // Scenario 6: Prevent duplicate submissions (Idempotency)
    // -------------------------------------------------------------
    console.log("\n--- Scenario 6: Prevent duplicate submissions ---");
    const duplicateRes = await request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/users/me/withdrawals",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`
        }
      },
      {
        amount: 500,
        destination: "0x71C2B5f9B61191Ac8d2F97b9A4B13B",
        idempotencyKey: validKey // Same key replayed
      }
    );
    assert(duplicateRes.status === 200, "Scenario 6.1: Duplicate request recognized with HTTP 200");
    assert(duplicateRes.data.isDuplicate === true, "Scenario 6.2: isDuplicate is true");
    assert(duplicateRes.data.withdrawal._id === validRes.data.withdrawal._id, "Scenario 6.3: Returns existing withdrawal record");

    // -------------------------------------------------------------
    // Scenario 7: Verify requested amount reserved correctly
    // -------------------------------------------------------------
    console.log("\n--- Scenario 7: Verify reserved balance ---");
    const walletAfterWd = await getOrCreateWallet(testUser._id);
    assert(walletAfterWd.balances.VE.available === 1800, "Scenario 7.1: Available balance decreased from 2300 to 1800 VE");
    assert(walletAfterWd.balances.VE.reserved === 500, "Scenario 7.2: Reserved balance increased from 0 to 500 VE");

    // -------------------------------------------------------------
    // Scenario 8: Verify wallet balances and ledger entries consistency
    // -------------------------------------------------------------
    console.log("\n--- Scenario 8: Verify ledger integrity ---");
    const holdTx = await WalletTransaction.findOne({
      userId: testUser._id,
      type: "HOLD",
      referenceType: "WITHDRAWAL"
    });
    assert(Boolean(holdTx), "Scenario 8.1: HOLD transaction recorded in immutable ledger");
    assert(Math.abs(holdTx.amount) === 500, "Scenario 8.2: Transaction amount matches requested 500 VE");
    assert(holdTx.balanceBefore === 2300, "Scenario 8.3: Ledger balanceBefore reflects 2300");
    assert(holdTx.balanceAfter === 1800, "Scenario 8.4: Ledger balanceAfter reflects 1800");

    const reconciliation = await reconcileWallet(testUser._id, "VE");
    assert(reconciliation.isReconciled === true, "Scenario 8.5: Full wallet-to-ledger reconciliation reports 100% agreement");
    assert(reconciliation.discrepancies.length === 0, "Scenario 8.6: Zero reconciliation discrepancies");

    // -------------------------------------------------------------
    // Scenario 9: Verify pending withdrawal status
    // -------------------------------------------------------------
    console.log("\n--- Scenario 9: Verify pending withdrawal status ---");
    const createdWd = await Withdrawal.findById(validRes.data.withdrawal._id);
    assert(createdWd.status === "pending", "Scenario 9.1: Status is 'pending'");
    assert(createdWd.amount === 500, "Scenario 9.2: Amount is 500");
    assert(createdWd.payoutDetails.accountIdentifier === "0x71C2B5f9B61191Ac8d2F97b9A4B13B", "Scenario 9.3: Account identifier stored accurately");

    // -------------------------------------------------------------
    // Scenario 10: Verify withdrawal history refreshes
    // -------------------------------------------------------------
    console.log("\n--- Scenario 10: Verify withdrawal history refreshes ---");
    const historyRes2 = await request({
      hostname: "127.0.0.1",
      port,
      path: "/api/users/me/withdrawals",
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(historyRes2.status === 200, "Scenario 10.1: GET /api/users/me/withdrawals returns HTTP 200");
    assert(historyRes2.data.withdrawals.length === 1, "Scenario 10.2: History now contains exactly 1 withdrawal");
    assert(historyRes2.data.withdrawals[0]._id === validRes.data.withdrawal._id, "Scenario 10.3: History contains the new withdrawal");
    assert(historyRes2.data.withdrawals[0].status === "pending", "Scenario 10.4: History record reflects 'pending' status");
    assert(historyRes2.data.pagination.total === 1, "Scenario 10.5: Pagination total count reflects 1");

    // Clean up test fixtures (preserving immutable WalletTransaction)
    await User.deleteOne({ _id: testUser._id });
    await Wallet.deleteOne({ userId: testUser._id });
    await Withdrawal.deleteMany({ userId: testUser._id });
    console.log("\n[PASS] Test fixtures cleaned up successfully");

  } catch (err) {
    console.error("Test execution failed:", err);
    failed++;
  } finally {
    server.close();
    await mongoose.disconnect();
    console.log("\n=======================================================");
    console.log(`WITHDRAWAL TEST SUITE SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log("=======================================================");
    process.exit(failed > 0 ? 1 : 0);
  }
}

runWithdrawalTests();

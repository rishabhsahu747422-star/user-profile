import mongoose from "mongoose";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import User from "./src/models/User.js";
import Wallet from "./src/models/Wallet.js";
import WalletTransaction from "./src/models/WalletTransaction.js";
import {
  getOrCreateWallet,
  executeCredit,
  isTransactionSupported
} from "./src/services/wallet.service.js";

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

async function runReplicaSetTests() {
  console.log("=== Section 2: Replica Set Multi-Document Transaction Verification ===\n");

  const tempDbDir = path.join(os.tmpdir(), `mongo-rs-${Date.now()}`);
  fs.mkdirSync(tempDbDir, { recursive: true });

  const mongodPath = "C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.exe";
  console.log("Starting isolated mongod with --replSet rsTest on port 27018...");

  const mongodProc = spawn(mongodPath, [
    "--port", "27018",
    "--dbpath", tempDbDir,
    "--replSet", "rsTest",
    "--bind_ip", "127.0.0.1"
  ]);

  mongodProc.on("error", (err) => {
    console.error("Failed to start mongod:", err);
  });
  mongodProc.stdout.on("data", (data) => {
    const str = data.toString();
    if (str.includes("REPL") || str.includes("error") || str.includes("State")) {
      console.log(`[mongod] ${str.trim()}`);
    }
  });

  // Wait 3 seconds for process boot
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const directUri = "mongodb://127.0.0.1:27018/admin?directConnection=true";
  const rsUri = "mongodb://127.0.0.1:27018/user-profile-test?replicaSet=rsTest";

  try {
    const initConn = await mongoose.createConnection(directUri).asPromise();
    try {
      const initRes = await initConn.db.admin().command({
        replSetInitiate: {
          _id: "rsTest",
          members: [{ _id: 0, host: "127.0.0.1:27018" }]
        }
      });
      console.log("Replica Set rsTest initiated:", JSON.stringify(initRes));
    } catch (e) {
      if (!e.message.includes("already initialized")) {
        console.warn("replSetInitiate notice:", e.message);
      }
    }

    // Wait until primary is elected on the admin connection
    let isPrimary = false;
    for (let i = 0; i < 30; i++) {
      try {
        const helloRes = await initConn.db.admin().command({ hello: 1 });
        console.log(`Polling hello: isWritablePrimary=${helloRes.isWritablePrimary}, setName=${helloRes.setName}`);
        if (helloRes.isWritablePrimary) {
          isPrimary = true;
          break;
        }
      } catch (err) {
        console.log(`hello error: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await initConn.close();

    assert(isPrimary, "Replica set successfully elected 127.0.0.1:27018 as primary");

    // Now connect standard mongoose connection to replica set
    await mongoose.connect(rsUri);

    const isRS = isTransactionSupported();
    assert(isRS, "isTransactionSupported() correctly detects Replica Set topology (isTransactionSupported: true)");

    const testUser = await User.create({
      name: "Replica Set Tester",
      email: `rs_user_${Date.now()}@example.com`,
      password: "Password123!",
      role: "user",
      status: "active"
    });

    const wallet = await getOrCreateWallet(testUser._id);
    assert(wallet.balances.VE.available === 0, "Initial wallet provisioned with 0 VEs");

    // 1. Successful Multi-Document Transaction
    const creditRes = await executeCredit({
      userId: testUser._id,
      assetType: "VE",
      amount: 1000,
      reason: "Replica Set Transaction Test",
      idempotencyKey: `rs_tx_1000_${Date.now()}`
    });
    assert(!creditRes.isDuplicate, "Executed credit via multi-document transaction");

    const walletCheck1 = await Wallet.findOne({ userId: testUser._id });
    assert(walletCheck1.balances.VE.available === 1000, "Wallet balance committed atomically to 1000 VEs");

    // 2. Aborted Multi-Document Transaction Rollback Test
    console.log("Testing multi-document transaction rollback on simulated mid-flight failure...");
    const session = await mongoose.startSession();
    let transactionAborted = false;
    try {
      await session.withTransaction(async () => {
        // Step A: mutate wallet inside transaction
        await Wallet.findByIdAndUpdate(
          wallet._id,
          { $inc: { "balances.VE.available": 500 } },
          { session }
        );

        // Step B: Simulate fatal exception before commit
        throw new Error("Simulated downstream ledger hardware/service failure");
      });
    } catch (err) {
      transactionAborted = true;
      assert(err.message.includes("Simulated downstream ledger"), "Expected exception caught during transaction execution");
    } finally {
      await session.endSession();
    }

    assert(transactionAborted, "Transaction was aborted by session.withTransaction");

    // Verify wallet was ROLLED BACK and did NOT persist the +500 VEs mutation
    const walletCheckAfterRollback = await Wallet.findOne({ userId: testUser._id });
    assert(walletCheckAfterRollback.balances.VE.available === 1000, "Multi-document rollback verified: Wallet available balance remains 1000 (NOT 1500)");

    await mongoose.disconnect();
  } finally {
    // Terminate the isolated test mongod process
    console.log("Stopping isolated replica set process...");
    mongodProc.kill();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      fs.rmSync(tempDbDir, { recursive: true, force: true });
    } catch {
      // Ignored
    }
  }

  console.log("\n=== Replica Set Test Summary ===");
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runReplicaSetTests().catch((err) => {
  console.error("Replica Set test failed:", err);
  process.exit(1);
});

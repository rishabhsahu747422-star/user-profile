import mongoose from "mongoose";
import Wallet, { SUPPORTED_ASSETS } from "../models/Wallet.js";
import WalletTransaction from "../models/WalletTransaction.js";
import User from "../models/User.js";

/**
 * Checks whether the active MongoDB topology supports multi-document transactions.
 * Multi-document transactions require a Replica Set or Sharded Cluster.
 */
export const isTransactionSupported = () => {
  const topology = mongoose.connection.client?.topology?.description;
  if (!topology) return false;
  return topology.type === "ReplicaSetWithPrimary" || topology.type === "Sharded";
};

/**
 * Idempotently retrieves or provisions a zero-balance wallet for a user.
 * Protected against race conditions using the unique index on userId.
 */
export const getOrCreateWallet = async (userId, session = null) => {
  if (!userId) {
    throw new Error("userId is required to get or create a wallet.");
  }

  let wallet = await Wallet.findOne({ userId }).session(session);
  if (wallet) {
    return wallet;
  }

  try {
    const newWallet = new Wallet({
      userId,
      balances: {
        VE: { available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 },
        SVE: { available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 },
        GEM: { available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 },
        TOKEN: { available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 }
      }
    });

    await newWallet.save({ session });
    return newWallet;
  } catch (error) {
    // If concurrent creation occurred, fetch the wallet created by the other request
    if (error.code === 11000) {
      return Wallet.findOne({ userId }).session(session);
    }
    throw error;
  }
};

/**
 * Retrieves the wallet for a user, provisioning one if none exists.
 */
export const getWalletByUserId = async (userId) => {
  return getOrCreateWallet(userId);
};

/**
 * Validates transaction inputs.
 */
const validateTransactionInputs = ({ assetType, amount, idempotencyKey, reason }) => {
  if (!SUPPORTED_ASSETS.includes(assetType)) {
    throw new Error(`Unsupported asset type: ${assetType}. Must be one of: ${SUPPORTED_ASSETS.join(", ")}`);
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Amount must be a positive integer. Got: ${amount}`);
  }

  if (!idempotencyKey || typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
    throw new Error("idempotencyKey is required for ledger operations.");
  }

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    throw new Error("Transaction reason is required.");
  }
};

/**
 * Executes a balance credit with an immutable ledger entry.
 */
export const executeCredit = async ({
  userId,
  assetType,
  amount,
  reason,
  referenceType = "SYSTEM",
  referenceId = null,
  idempotencyKey,
  actor = { role: "system", type: "SYSTEM" }
}) => {
  validateTransactionInputs({ assetType, amount, idempotencyKey, reason });

  // 1. Idempotency check: Return existing transaction if already processed
  const existingTx = await WalletTransaction.findOne({ idempotencyKey });
  if (existingTx) {
    return { transaction: existingTx, isDuplicate: true };
  }

  const wallet = await getOrCreateWallet(userId);

  if (isTransactionSupported()) {
    // Multi-Document Transaction path (Replica Set / Cluster)
    const session = await mongoose.startSession();
    try {
      let resultTx;
      await session.withTransaction(async () => {
        const lockedWallet = await Wallet.findOne({ _id: wallet._id }).session(session);
        if (!lockedWallet) throw new Error("Wallet not found.");
        if (lockedWallet.isLocked) throw new Error("Wallet is locked.");

        const balanceBefore = lockedWallet.balances[assetType].available;
        lockedWallet.balances[assetType].available += amount;
        lockedWallet.balances[assetType].totalEarned += amount;
        const balanceAfter = lockedWallet.balances[assetType].available;

        await lockedWallet.save({ session });

        const tx = new WalletTransaction({
          userId,
          walletId: wallet._id,
          assetType,
          type: "CREDIT",
          amount,
          balanceBefore,
          balanceAfter,
          reason: reason.trim(),
          referenceType,
          referenceId,
          idempotencyKey: idempotencyKey.trim(),
          actor
        });

        await tx.save({ session });
        resultTx = tx;
      });

      return { transaction: resultTx, isDuplicate: false };
    } finally {
      await session.endSession();
    }
  } else {
    // Two-Phase Compensating Ledger Protocol (Standalone Fallback)
    const balanceBefore = wallet.balances[assetType].available;

    const updatedWallet = await Wallet.findOneAndUpdate(
      { _id: wallet._id, isLocked: false },
      {
        $inc: {
          [`balances.${assetType}.available`]: amount,
          [`balances.${assetType}.totalEarned`]: amount
        }
      },
      { returnDocument: "after" }
    );

    if (!updatedWallet) {
      throw new Error("Wallet update failed or wallet is locked.");
    }

    const balanceAfter = updatedWallet.balances[assetType].available;

    try {
      const tx = new WalletTransaction({
        userId,
        walletId: wallet._id,
        assetType,
        type: "CREDIT",
        amount,
        balanceBefore,
        balanceAfter,
        reason: reason.trim(),
        referenceType,
        referenceId,
        idempotencyKey: idempotencyKey.trim(),
        actor
      });

      await tx.save();
      return { transaction: tx, isDuplicate: false };
    } catch (txError) {
      // Compensating reversal: Roll back the wallet credit if transaction record fails
      await Wallet.findByIdAndUpdate(wallet._id, {
        $inc: {
          [`balances.${assetType}.available`]: -amount,
          [`balances.${assetType}.totalEarned`]: -amount
        }
      });
      throw txError;
    }
  }
};

/**
 * Executes a balance debit with an immutable ledger entry.
 * Guarantees no negative balances via atomic pre-condition query.
 */
export const executeDebit = async ({
  userId,
  assetType,
  amount,
  reason,
  referenceType = "SYSTEM",
  referenceId = null,
  idempotencyKey,
  actor = { role: "system", type: "SYSTEM" }
}) => {
  validateTransactionInputs({ assetType, amount, idempotencyKey, reason });

  // 1. Idempotency check
  const existingTx = await WalletTransaction.findOne({ idempotencyKey });
  if (existingTx) {
    return { transaction: existingTx, isDuplicate: true };
  }

  const wallet = await getOrCreateWallet(userId);

  if (isTransactionSupported()) {
    // Multi-Document Transaction path
    const session = await mongoose.startSession();
    try {
      let resultTx;
      await session.withTransaction(async () => {
        const lockedWallet = await Wallet.findOne({ _id: wallet._id }).session(session);
        if (!lockedWallet) throw new Error("Wallet not found.");
        if (lockedWallet.isLocked) throw new Error("Wallet is locked.");

        const currentAvailable = lockedWallet.balances[assetType].available;
        if (currentAvailable < amount) {
          throw new Error(`Insufficient available ${assetType} balance. Required: ${amount}, Available: ${currentAvailable}`);
        }

        const balanceBefore = currentAvailable;
        lockedWallet.balances[assetType].available -= amount;
        const balanceAfter = lockedWallet.balances[assetType].available;

        await lockedWallet.save({ session });

        const tx = new WalletTransaction({
          userId,
          walletId: wallet._id,
          assetType,
          type: "DEBIT",
          amount: -amount, // Negative signed amount indicates debit
          balanceBefore,
          balanceAfter,
          reason: reason.trim(),
          referenceType,
          referenceId,
          idempotencyKey: idempotencyKey.trim(),
          actor
        });

        await tx.save({ session });
        resultTx = tx;
      });

      return { transaction: resultTx, isDuplicate: false };
    } finally {
      await session.endSession();
    }
  } else {
    // Two-Phase Compensating Ledger Protocol
    // Atomic check-and-decrement: balance must be >= amount
    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
        isLocked: false,
        [`balances.${assetType}.available`]: { $gte: amount }
      },
      {
        $inc: {
          [`balances.${assetType}.available`]: -amount
        }
      },
      { returnDocument: "after" }
    );

    if (!updatedWallet) {
      throw new Error(`Insufficient available ${assetType} balance or wallet is locked.`);
    }

    const balanceAfter = updatedWallet.balances[assetType].available;
    const balanceBefore = balanceAfter + amount;

    try {
      const tx = new WalletTransaction({
        userId,
        walletId: wallet._id,
        assetType,
        type: "DEBIT",
        amount: -amount,
        balanceBefore,
        balanceAfter,
        reason: reason.trim(),
        referenceType,
        referenceId,
        idempotencyKey: idempotencyKey.trim(),
        actor
      });

      await tx.save();
      return { transaction: tx, isDuplicate: false };
    } catch (txError) {
      // Compensating reversal: Restore the debited amount if ledger insertion fails
      await Wallet.findByIdAndUpdate(wallet._id, {
        $inc: {
          [`balances.${assetType}.available`]: amount
        }
      });
      throw txError;
    }
  }
};

/**
 * Reserves funds in a user's wallet (moves from available to reserved).
 * Used during pending withdrawal requests.
 */
export const holdBalance = async ({
  userId,
  assetType,
  amount,
  reason,
  referenceType = "WITHDRAWAL",
  referenceId = null,
  idempotencyKey,
  actor = { role: "system", type: "SYSTEM" }
}) => {
  validateTransactionInputs({ assetType, amount, idempotencyKey, reason });

  // 1. Idempotency check
  const existingTx = await WalletTransaction.findOne({ idempotencyKey });
  if (existingTx) {
    return { transaction: existingTx, isDuplicate: true };
  }

  const wallet = await getOrCreateWallet(userId);

  if (isTransactionSupported()) {
    const session = await mongoose.startSession();
    try {
      let resultTx;
      await session.withTransaction(async () => {
        const lockedWallet = await Wallet.findOne({ _id: wallet._id }).session(session);
        if (!lockedWallet) throw new Error("Wallet not found.");
        if (lockedWallet.isLocked) throw new Error("Wallet is locked.");

        const currentAvailable = lockedWallet.balances[assetType].available;
        if (currentAvailable < amount) {
          throw new Error(`Insufficient available ${assetType} balance. Required: ${amount}, Available: ${currentAvailable}`);
        }

        const balanceBefore = currentAvailable;
        lockedWallet.balances[assetType].available -= amount;
        lockedWallet.balances[assetType].reserved += amount;
        const balanceAfter = lockedWallet.balances[assetType].available;

        await lockedWallet.save({ session });

        const tx = new WalletTransaction({
          userId,
          walletId: wallet._id,
          assetType,
          type: "HOLD",
          amount: -amount,
          balanceBefore,
          balanceAfter,
          reason: reason.trim(),
          referenceType,
          referenceId,
          idempotencyKey: idempotencyKey.trim(),
          actor
        });

        await tx.save({ session });
        resultTx = tx;
      });

      return { transaction: resultTx, isDuplicate: false };
    } finally {
      await session.endSession();
    }
  } else {
    // Standalone fallback: Atomic conditional check-and-move
    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
        isLocked: false,
        [`balances.${assetType}.available`]: { $gte: amount }
      },
      {
        $inc: {
          [`balances.${assetType}.available`]: -amount,
          [`balances.${assetType}.reserved`]: amount
        }
      },
      { returnDocument: "after" }
    );

    if (!updatedWallet) {
      throw new Error(`Insufficient available ${assetType} balance or wallet is locked.`);
    }

    const balanceAfter = updatedWallet.balances[assetType].available;
    const balanceBefore = balanceAfter + amount;

    try {
      const tx = new WalletTransaction({
        userId,
        walletId: wallet._id,
        assetType,
        type: "HOLD",
        amount: -amount,
        balanceBefore,
        balanceAfter,
        reason: reason.trim(),
        referenceType,
        referenceId,
        idempotencyKey: idempotencyKey.trim(),
        actor
      });

      await tx.save();
      return { transaction: tx, isDuplicate: false };
    } catch (txError) {
      // Compensating reversal on failure
      await Wallet.findByIdAndUpdate(wallet._id, {
        $inc: {
          [`balances.${assetType}.available`]: amount,
          [`balances.${assetType}.reserved`]: -amount
        }
      });
      throw txError;
    }
  }
};

/**
 * Releases reserved funds back to available balance.
 * Used upon withdrawal rejection or cancellation.
 */
export const releaseHold = async ({
  userId,
  assetType,
  amount,
  reason,
  referenceType = "WITHDRAWAL",
  referenceId = null,
  idempotencyKey,
  actor = { role: "system", type: "SYSTEM" }
}) => {
  validateTransactionInputs({ assetType, amount, idempotencyKey, reason });

  const existingTx = await WalletTransaction.findOne({ idempotencyKey });
  if (existingTx) {
    return { transaction: existingTx, isDuplicate: true };
  }

  const wallet = await getOrCreateWallet(userId);

  if (isTransactionSupported()) {
    const session = await mongoose.startSession();
    try {
      let resultTx;
      await session.withTransaction(async () => {
        const lockedWallet = await Wallet.findOne({ _id: wallet._id }).session(session);
        if (!lockedWallet) throw new Error("Wallet not found.");

        const currentReserved = lockedWallet.balances[assetType].reserved;
        if (currentReserved < amount) {
          throw new Error(`Insufficient reserved ${assetType} balance to release. Required: ${amount}, Reserved: ${currentReserved}`);
        }

        const balanceBefore = lockedWallet.balances[assetType].available;
        lockedWallet.balances[assetType].reserved -= amount;
        lockedWallet.balances[assetType].available += amount;
        const balanceAfter = lockedWallet.balances[assetType].available;

        await lockedWallet.save({ session });

        const tx = new WalletTransaction({
          userId,
          walletId: wallet._id,
          assetType,
          type: "RELEASE",
          amount: amount,
          balanceBefore,
          balanceAfter,
          reason: reason.trim(),
          referenceType,
          referenceId,
          idempotencyKey: idempotencyKey.trim(),
          actor
        });

        await tx.save({ session });
        resultTx = tx;
      });

      return { transaction: resultTx, isDuplicate: false };
    } finally {
      await session.endSession();
    }
  } else {
    // Standalone fallback
    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
        [`balances.${assetType}.reserved`]: { $gte: amount }
      },
      {
        $inc: {
          [`balances.${assetType}.reserved`]: -amount,
          [`balances.${assetType}.available`]: amount
        }
      },
      { returnDocument: "after" }
    );

    if (!updatedWallet) {
      throw new Error(`Insufficient reserved ${assetType} balance to release.`);
    }

    const balanceAfter = updatedWallet.balances[assetType].available;
    const balanceBefore = balanceAfter - amount;

    try {
      const tx = new WalletTransaction({
        userId,
        walletId: wallet._id,
        assetType,
        type: "RELEASE",
        amount: amount,
        balanceBefore,
        balanceAfter,
        reason: reason.trim(),
        referenceType,
        referenceId,
        idempotencyKey: idempotencyKey.trim(),
        actor
      });

      await tx.save();
      return { transaction: tx, isDuplicate: false };
    } catch (txError) {
      await Wallet.findByIdAndUpdate(wallet._id, {
        $inc: {
          [`balances.${assetType}.reserved`]: amount,
          [`balances.${assetType}.available`]: -amount
        }
      });
      throw txError;
    }
  }
};

/**
 * Settles a reserved balance as permanently withdrawn.
 * Decrements reserved and increments totalWithdrawn.
 */
export const settleHold = async ({
  userId,
  assetType,
  amount,
  reason,
  referenceType = "WITHDRAWAL",
  referenceId = null,
  idempotencyKey,
  actor = { role: "system", type: "SYSTEM" }
}) => {
  validateTransactionInputs({ assetType, amount, idempotencyKey, reason });

  const existingTx = await WalletTransaction.findOne({ idempotencyKey });
  if (existingTx) {
    return { transaction: existingTx, isDuplicate: true };
  }

  const wallet = await getOrCreateWallet(userId);

  if (isTransactionSupported()) {
    const session = await mongoose.startSession();
    try {
      let resultTx;
      await session.withTransaction(async () => {
        const lockedWallet = await Wallet.findOne({ _id: wallet._id }).session(session);
        if (!lockedWallet) throw new Error("Wallet not found.");

        const currentReserved = lockedWallet.balances[assetType].reserved;
        if (currentReserved < amount) {
          throw new Error(`Insufficient reserved ${assetType} balance to settle. Required: ${amount}, Reserved: ${currentReserved}`);
        }

        const balanceBefore = lockedWallet.balances[assetType].available;
        lockedWallet.balances[assetType].reserved -= amount;
        lockedWallet.balances[assetType].totalWithdrawn += amount;
        const balanceAfter = lockedWallet.balances[assetType].available;

        await lockedWallet.save({ session });

        const tx = new WalletTransaction({
          userId,
          walletId: wallet._id,
          assetType,
          type: "SETTLE",
          amount: -amount,
          balanceBefore,
          balanceAfter,
          reason: reason.trim(),
          referenceType,
          referenceId,
          idempotencyKey: idempotencyKey.trim(),
          actor
        });

        await tx.save({ session });
        resultTx = tx;
      });

      return { transaction: resultTx, isDuplicate: false };
    } finally {
      await session.endSession();
    }
  } else {
    // Standalone fallback
    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
        [`balances.${assetType}.reserved`]: { $gte: amount }
      },
      {
        $inc: {
          [`balances.${assetType}.reserved`]: -amount,
          [`balances.${assetType}.totalWithdrawn`]: amount
        }
      },
      { returnDocument: "after" }
    );

    if (!updatedWallet) {
      throw new Error(`Insufficient reserved ${assetType} balance to settle.`);
    }

    const balanceAfter = updatedWallet.balances[assetType].available;
    const balanceBefore = balanceAfter;

    try {
      const tx = new WalletTransaction({
        userId,
        walletId: wallet._id,
        assetType,
        type: "SETTLE",
        amount: -amount,
        balanceBefore,
        balanceAfter,
        reason: reason.trim(),
        referenceType,
        referenceId,
        idempotencyKey: idempotencyKey.trim(),
        actor
      });

      await tx.save();
      return { transaction: tx, isDuplicate: false };
    } catch (txError) {
      await Wallet.findByIdAndUpdate(wallet._id, {
        $inc: {
          [`balances.${assetType}.reserved`]: amount,
          [`balances.${assetType}.totalWithdrawn`]: -amount
        }
      });
      throw txError;
    }
  }
};

/**
 * Reconciles a user's wallet against their immutable transaction history.
 */
export const reconcileWallet = async (userId) => {
  const wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    throw new Error(`Wallet not found for user: ${userId}`);
  }

  const transactions = await WalletTransaction.find({ userId });

  const summary = {
    VE: { credits: 0, debits: 0 },
    SVE: { credits: 0, debits: 0 },
    GEM: { credits: 0, debits: 0 },
    TOKEN: { credits: 0, debits: 0 }
  };

  for (const tx of transactions) {
    if (summary[tx.assetType]) {
      if (tx.type === "CREDIT") {
        summary[tx.assetType].credits += tx.amount;
      } else if (tx.type === "DEBIT" || tx.type === "SETTLE") {
        summary[tx.assetType].debits += Math.abs(tx.amount);
      }
    }
  }

  const discrepancies = [];
  for (const asset of SUPPORTED_ASSETS) {
    const ledgerNet = summary[asset].credits - summary[asset].debits;
    const walletNet = wallet.balances[asset].available + wallet.balances[asset].reserved;

    if (ledgerNet !== walletNet) {
      discrepancies.push({
        asset,
        ledgerNet,
        walletNet,
        difference: walletNet - ledgerNet
      });
    }
  }

  return {
    userId,
    isReconciled: discrepancies.length === 0,
    discrepancies,
    ledgerSummary: summary,
    walletBalances: wallet.balances
  };
};

/**
 * Idempotently provisions wallets for all existing registered users.
 */
export const backfillWallets = async () => {
  const users = await User.find({}, "_id");
  let createdCount = 0;
  let existingCount = 0;

  for (const user of users) {
    const existing = await Wallet.findOne({ userId: user._id });
    if (!existing) {
      await getOrCreateWallet(user._id);
      createdCount++;
    } else {
      existingCount++;
    }
  }

  return { totalUsers: users.length, createdCount, existingCount };
};

import Withdrawal, {
  WITHDRAWAL_STATUSES,
  ALLOWED_WITHDRAWAL_TRANSITIONS
} from "../models/Withdrawal.js";
import {
  holdBalance,
  releaseHold,
  settleHold,
  getOrCreateWallet
} from "./wallet.service.js";
import { SUPPORTED_ASSETS } from "../models/Wallet.js";
import { logAdminAction } from "./audit.service.js";

/**
 * Creates a new withdrawal request and reserves the requested balance.
 */
export const createWithdrawalRequest = async ({
  userId,
  assetType = "VE",
  amount,
  payoutMethod = "MANUAL",
  payoutDetails = {},
  idempotencyKey
}) => {
  if (!userId) throw new Error("userId is required.");
  if (!SUPPORTED_ASSETS.includes(assetType)) {
    throw new Error(`Unsupported withdrawal asset: ${assetType}. Must be one of: ${SUPPORTED_ASSETS.join(", ")}`);
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Withdrawal amount must be a positive integer. Got: ${amount}`);
  }
  if (!idempotencyKey || typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
    throw new Error("idempotencyKey is required for withdrawal requests.");
  }

  // Idempotency check: Return existing request if already created
  const existingWithdrawal = await Withdrawal.findOne({ idempotencyKey: idempotencyKey.trim() });
  if (existingWithdrawal) {
    return { withdrawal: existingWithdrawal, isDuplicate: true };
  }

  // 1. Reserve funds in user's wallet
  const holdRes = await holdBalance({
    userId,
    assetType,
    amount,
    reason: `Withdrawal request reserve: ${amount} ${assetType}`,
    referenceType: "WITHDRAWAL",
    idempotencyKey: `hold_${idempotencyKey.trim()}`,
    actor: { id: userId, role: "user", type: "USER" }
  });

  try {
    const withdrawal = new Withdrawal({
      userId,
      assetType,
      amount,
      payoutMethod,
      payoutDetails: {
        accountIdentifier: payoutDetails.accountIdentifier || null
      },
      status: "pending",
      holdTransactionId: holdRes.transaction._id,
      idempotencyKey: idempotencyKey.trim(),
      statusHistory: [
        {
          fromStatus: "pending",
          toStatus: "pending",
          reason: "Withdrawal request initiated by user",
          changedBy: { id: userId, role: "user" },
          changedAt: new Date()
        }
      ]
    });

    await withdrawal.save();
    return { withdrawal, isDuplicate: false };
  } catch (error) {
    // If saving the withdrawal record fails, release the reserved funds immediately
    await releaseHold({
      userId,
      assetType,
      amount,
      reason: "Compensating release: Withdrawal record creation failed",
      referenceType: "WITHDRAWAL",
      idempotencyKey: `compensating_release_${idempotencyKey.trim()}`,
      actor: { id: userId, role: "system", type: "SYSTEM" }
    });
    throw error;
  }
};

/**
 * Returns withdrawal overview metrics for a user as required by Task 14 Section 11.
 * Strict rule: Pending or rejected requests are NEVER included in total amount successfully withdrawn.
 */
export const getUserWithdrawalSummary = async (userId) => {
  if (!userId) throw new Error("userId is required.");

  const [totalRequests, pending, approved, completed, rejected, cancelled] = await Promise.all([
    Withdrawal.countDocuments({ userId }),
    Withdrawal.countDocuments({ userId, status: "pending" }),
    Withdrawal.countDocuments({ userId, status: "approved" }),
    Withdrawal.countDocuments({ userId, status: "completed" }),
    Withdrawal.countDocuments({ userId, status: "rejected" }),
    Withdrawal.countDocuments({ userId, status: "cancelled" })
  ]);

  // Sum only completed withdrawals
  const completedWithdrawals = await Withdrawal.aggregate([
    { $match: { userId, status: "completed" } },
    { $group: { _id: null, totalWithdrawn: { $sum: "$amount" } } }
  ]);

  const totalWithdrawn = completedWithdrawals.length > 0 ? completedWithdrawals[0].totalWithdrawn : 0;

  return {
    totalRequests,
    pending,
    approved,
    completed,
    rejected: rejected + cancelled,
    totalWithdrawn,
    asset: "VE"
  };
};

/**
 * Retrieves paginated withdrawal history for the authenticated user.
 */
export const getUserWithdrawalHistory = async (
  userId,
  { page = 1, limit = 10, status = null } = {}
) => {
  if (!userId) throw new Error("userId is required.");

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  const query = { userId };
  if (status && WITHDRAWAL_STATUSES.includes(status)) {
    query.status = status;
  }

  const [withdrawals, total] = await Promise.all([
    Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Withdrawal.countDocuments(query)
  ]);

  return {
    withdrawals,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1
    }
  };
};

/**
 * Retrieves a single withdrawal by ID, verifying ownership or admin access.
 */
export const getWithdrawalById = async (userId, withdrawalId, isAdmin = false) => {
  const query = { _id: withdrawalId };
  if (!isAdmin) {
    query.userId = userId;
  }

  const withdrawal = await Withdrawal.findOne(query);
  if (!withdrawal) {
    throw new Error("Withdrawal request not found or access denied.");
  }
  return withdrawal;
};

/**
 * Cancels a pending withdrawal request (User action).
 * Releases the held funds back to available balance.
 */
export const cancelWithdrawalRequest = async ({
  userId,
  withdrawalId,
  reason = "Cancelled by user"
}) => {
  const withdrawal = await Withdrawal.findOne({ _id: withdrawalId, userId });
  if (!withdrawal) {
    throw new Error("Withdrawal request not found or access denied.");
  }

  if (withdrawal.status !== "pending") {
    throw new Error(`Cannot cancel withdrawal with status '${withdrawal.status}'. Only 'pending' requests can be cancelled.`);
  }

  // Release the reserved funds
  const releaseRes = await releaseHold({
    userId,
    assetType: withdrawal.assetType,
    amount: withdrawal.amount,
    reason: `Withdrawal cancelled by user: ${reason.trim()}`,
    referenceType: "WITHDRAWAL",
    referenceId: withdrawal._id.toString(),
    idempotencyKey: `cancel_release_${withdrawal._id}`,
    actor: { id: userId, role: "user", type: "USER" }
  });

  withdrawal.status = "cancelled";
  withdrawal.cancellationReason = reason.trim();
  withdrawal.releaseTransactionId = releaseRes.transaction._id;
  withdrawal.statusHistory.push({
    fromStatus: "pending",
    toStatus: "cancelled",
    reason: reason.trim(),
    changedBy: { id: userId, role: "user" },
    changedAt: new Date()
  });

  await withdrawal.save();
  return withdrawal;
};

/**
 * Admin action: Reviews a withdrawal request (Approve or Reject).
 */
export const reviewWithdrawalRequest = async ({
  withdrawalId,
  adminUser,
  decision,
  reason,
  adminNotes = null
}) => {
  if (!decision || !["approve", "reject"].includes(decision)) {
    throw new Error("Decision must be either 'approve' or 'reject'.");
  }
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    throw new Error("A reason is mandatory for administrative withdrawal decisions.");
  }

  const withdrawal = await Withdrawal.findById(withdrawalId);
  if (!withdrawal) {
    throw new Error("Withdrawal request not found.");
  }

  const currentStatus = withdrawal.status;

  if (decision === "approve") {
    if (currentStatus !== "pending") {
      throw new Error(`Cannot approve withdrawal with status '${currentStatus}'. Only 'pending' requests can be approved.`);
    }

    withdrawal.status = "approved";
    withdrawal.reviewedAt = new Date();
    withdrawal.reviewedBy = adminUser._id;
    withdrawal.adminNotes = adminNotes ? adminNotes.trim() : null;
    withdrawal.statusHistory.push({
      fromStatus: "pending",
      toStatus: "approved",
      reason: reason.trim(),
      changedBy: { id: adminUser._id, role: adminUser.role },
      changedAt: new Date()
    });

    await withdrawal.save();

    await logAdminAction({
      adminUser,
      action: "WITHDRAWAL_APPROVE",
      targetType: "WITHDRAWAL",
      targetId: withdrawal._id,
      details: {
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        assetType: withdrawal.assetType,
        withdrawalId: withdrawal.withdrawalId
      },
      reason: reason.trim()
    });

    return withdrawal;
  } else {
    // Reject
    const allowed = ALLOWED_WITHDRAWAL_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes("rejected")) {
      throw new Error(`Cannot reject withdrawal with status '${currentStatus}'.`);
    }

    // Release the reserved funds
    const releaseRes = await releaseHold({
      userId: withdrawal.userId,
      assetType: withdrawal.assetType,
      amount: withdrawal.amount,
      reason: `Withdrawal rejected by administrator: ${reason.trim()}`,
      referenceType: "WITHDRAWAL",
      referenceId: withdrawal._id.toString(),
      idempotencyKey: `reject_release_${withdrawal._id}`,
      actor: { id: adminUser._id, role: adminUser.role, type: "ADMIN" }
    });

    withdrawal.status = "rejected";
    withdrawal.rejectionReason = reason.trim();
    withdrawal.reviewedAt = new Date();
    withdrawal.reviewedBy = adminUser._id;
    withdrawal.adminNotes = adminNotes ? adminNotes.trim() : null;
    withdrawal.releaseTransactionId = releaseRes.transaction._id;
    withdrawal.statusHistory.push({
      fromStatus: currentStatus,
      toStatus: "rejected",
      reason: reason.trim(),
      changedBy: { id: adminUser._id, role: adminUser.role },
      changedAt: new Date()
    });

    await withdrawal.save();

    await logAdminAction({
      adminUser,
      action: "WITHDRAWAL_REJECT",
      targetType: "WITHDRAWAL",
      targetId: withdrawal._id,
      details: {
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        assetType: withdrawal.assetType,
        withdrawalId: withdrawal.withdrawalId,
        releaseTransactionId: releaseRes.transaction._id
      },
      reason: reason.trim()
    });

    return withdrawal;
  }
};

/**
 * Admin action: Settles an approved withdrawal request (Marks Completed).
 * Settle moves funds from reserved to totalWithdrawn permanently.
 */
export const settleWithdrawalRequest = async ({
  withdrawalId,
  adminUser,
  reason = "Payout successfully disbursed and settled"
}) => {
  const withdrawal = await Withdrawal.findById(withdrawalId);
  if (!withdrawal) {
    throw new Error("Withdrawal request not found.");
  }

  if (withdrawal.status !== "approved") {
    throw new Error(`Cannot settle withdrawal with status '${withdrawal.status}'. Only 'approved' requests can be settled.`);
  }

  // Settle reserved funds
  const settleRes = await settleHold({
    userId: withdrawal.userId,
    assetType: withdrawal.assetType,
    amount: withdrawal.amount,
    reason: `Settlement for withdrawal ${withdrawal.withdrawalId}: ${reason.trim()}`,
    referenceType: "WITHDRAWAL",
    referenceId: withdrawal._id.toString(),
    idempotencyKey: `settle_${withdrawal._id}`,
    actor: { id: adminUser._id, role: adminUser.role, type: "ADMIN" }
  });

  withdrawal.status = "completed";
  withdrawal.settleTransactionId = settleRes.transaction._id;
  withdrawal.completedAt = new Date();
  withdrawal.statusHistory.push({
    fromStatus: "approved",
    toStatus: "completed",
    reason: reason.trim(),
    changedBy: { id: adminUser._id, role: adminUser.role },
    changedAt: new Date()
  });

  await withdrawal.save();

  await logAdminAction({
    adminUser,
    action: "WITHDRAWAL_SETTLE",
    targetType: "WITHDRAWAL",
    targetId: withdrawal._id,
    details: {
      userId: withdrawal.userId,
      amount: withdrawal.amount,
      assetType: withdrawal.assetType,
      withdrawalId: withdrawal.withdrawalId,
      settleTransactionId: settleRes.transaction._id
    },
    reason: reason.trim()
  });

  return withdrawal;
};


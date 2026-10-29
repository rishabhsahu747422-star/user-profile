import mongoose from "mongoose";
import User from "../models/User.js";
import Wallet, { SUPPORTED_ASSETS } from "../models/Wallet.js";
import Withdrawal from "../models/Withdrawal.js";
import UserProgress from "../models/UserProgress.js";
import Referral from "../models/Referral.js";
import { logAdminAction, getAuditLogs } from "./audit.service.js";
import { getOrCreateWallet } from "./wallet.service.js";
import { calculateLevelForXp, getOrCreateUserProgress } from "./progression.service.js";
import { getUserWithdrawalSummary } from "./withdrawal.service.js";
import { getUserReferralSummary } from "./referral.service.js";

/**
 * Aggregates platform-wide dashboard overview metrics for administrators.
 */
export const getAdminOverview = async () => {
  // 1. User metrics
  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    inactiveUsers,
    adminUsers
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: "active" }),
    User.countDocuments({ status: "suspended" }),
    User.countDocuments({ status: "inactive" }),
    User.countDocuments({ role: "admin" })
  ]);

  // 2. Withdrawal metrics by status
  const [
    totalRequests,
    pendingCount,
    approvedCount,
    completedCount,
    rejectedCount,
    cancelledCount
  ] = await Promise.all([
    Withdrawal.countDocuments(),
    Withdrawal.countDocuments({ status: "pending" }),
    Withdrawal.countDocuments({ status: "approved" }),
    Withdrawal.countDocuments({ status: "completed" }),
    Withdrawal.countDocuments({ status: "rejected" }),
    Withdrawal.countDocuments({ status: "cancelled" })
  ]);

  // Financial aggregates: settled amount vs pending reserved
  const [settledAgg, pendingAgg] = await Promise.all([
    Withdrawal.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: "$assetType", totalAmount: { $sum: "$amount" } } }
    ]),
    Withdrawal.aggregate([
      { $match: { status: "pending" } },
      { $group: { _id: "$assetType", totalAmount: { $sum: "$amount" } } }
    ])
  ]);

  const settledByAsset = {};
  SUPPORTED_ASSETS.forEach((asset) => {
    settledByAsset[asset] = 0;
  });
  settledAgg.forEach((item) => {
    if (settledByAsset[item._id] !== undefined) {
      settledByAsset[item._id] = item.totalAmount;
    }
  });

  const pendingByAsset = {};
  SUPPORTED_ASSETS.forEach((asset) => {
    pendingByAsset[asset] = 0;
  });
  pendingAgg.forEach((item) => {
    if (pendingByAsset[item._id] !== undefined) {
      pendingByAsset[item._id] = item.totalAmount;
    }
  });

  // 3. Platform Circulation across wallets
  const walletAgg = await Wallet.aggregate([
    {
      $group: {
        _id: null,
        totalVeAvailable: { $sum: "$balances.VE.available" },
        totalVeReserved: { $sum: "$balances.VE.reserved" },
        totalVeEarned: { $sum: "$balances.VE.totalEarned" },
        totalSveAvailable: { $sum: "$balances.SVE.available" },
        totalGemAvailable: { $sum: "$balances.GEM.available" },
        totalTokenAvailable: { $sum: "$balances.TOKEN.available" }
      }
    }
  ]);

  const walletCirculation = walletAgg[0] || {
    totalVeAvailable: 0,
    totalVeReserved: 0,
    totalVeEarned: 0,
    totalSveAvailable: 0,
    totalGemAvailable: 0,
    totalTokenAvailable: 0
  };

  // 4. Latest administrative audit logs
  const { logs: recentAuditLogs } = await getAuditLogs({ page: 1, limit: 10 });

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      suspended: suspendedUsers,
      inactive: inactiveUsers,
      admins: adminUsers
    },
    withdrawals: {
      totalRequests,
      pending: pendingCount,
      approved: approvedCount,
      completed: completedCount,
      rejected: rejectedCount,
      cancelled: cancelledCount,
      totalSettledAmount: settledByAsset.VE || 0,
      totalPendingReserved: pendingByAsset.VE || 0,
      settledByAsset,
      pendingByAsset
    },
    circulation: {
      VE: {
        available: walletCirculation.totalVeAvailable,
        reserved: walletCirculation.totalVeReserved,
        totalEarned: walletCirculation.totalVeEarned
      },
      SVE: {
        available: walletCirculation.totalSveAvailable
      },
      GEM: {
        available: walletCirculation.totalGemAvailable
      },
      TOKEN: {
        available: walletCirculation.totalTokenAvailable
      }
    },
    recentAuditLogs
  };
};

/**
 * Lists paginated users with optional search and filters for administrators.
 */
export const getAdminUsers = async ({
  page = 1,
  limit = 20,
  search = "",
  status,
  role,
  sortBy = "createdAt",
  sortOrder = "desc"
} = {}) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const query = {};

  if (search && search.trim()) {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
      { referralCode: { $regex: escapedSearch, $options: "i" } }
    ];
  }

  if (status && ["active", "suspended", "inactive"].includes(status)) {
    query.status = status;
  }

  if (role && ["user", "admin"].includes(role)) {
    query.role = role;
  }

  const sortDirections = { asc: 1, desc: -1 };
  const sortDirection = sortDirections[sortOrder] || -1;
  const sort = { [sortBy]: sortDirection };

  const [rawUsers, total] = await Promise.all([
    User.find(query)
      .select("-password")
      .sort(sort)
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    User.countDocuments(query)
  ]);

  // Attach basic wallet summary for each user
  const userIds = rawUsers.map((u) => u._id);
  const wallets = await Wallet.find({ userId: { $in: userIds } }).lean();
  const walletMap = new Map();
  wallets.forEach((w) => {
    walletMap.set(w.userId.toString(), w);
  });

  const users = rawUsers.map((u) => {
    const w = walletMap.get(u._id.toString());
    return {
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      referralCode: u.referralCode || null,
      createdAt: u.createdAt,
      wallet: {
        VE: w?.balances?.VE?.available || 0,
        reservedVE: w?.balances?.VE?.reserved || 0,
        GEM: w?.balances?.GEM?.available || 0
      }
    };
  });

  return {
    users,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1
    }
  };
};

/**
 * Returns complete profile and financial details of a specific user for administrative review.
 */
export const getAdminUserDetails = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid or missing user ID.");
  }

  const user = await User.findById(userId).select("-password").lean();
  if (!user) {
    throw new Error("User not found.");
  }

  // Fetch or auto-provision wallet
  const wallet = await getOrCreateWallet(user._id);

  // Fetch progression
  const progress = await getOrCreateUserProgress(user._id);
  const levelInfo = await calculateLevelForXp(progress.currentXp);

  // Fetch referral summary
  const referralSummary = await getUserReferralSummary(user._id);

  // Fetch withdrawal summary
  const withdrawalSummary = await getUserWithdrawalSummary(user._id);

  // Fetch recent withdrawals for this user
  const recentWithdrawals = await Withdrawal.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Fetch audit records relating to this user
  const auditLogs = await getAuditLogs({
    targetType: "USER",
    targetId: user._id.toString(),
    limit: 10
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      referralCode: user.referralCode || null,
      createdAt: user.createdAt
    },
    wallet: {
      balances: wallet.balances
    },
    progression: {
      currentLevel: levelInfo.currentLevel,
      currentLevelName: levelInfo.currentLevelName,
      currentXp: progress.currentXp,
      totalXpEarned: progress.totalXpEarned,
      progressPercentage: levelInfo.progressPercentage,
      xpRemaining: levelInfo.xpRemaining
    },
    referrals: referralSummary,
    withdrawals: {
      ...withdrawalSummary,
      recent: recentWithdrawals
    },
    auditHistory: auditLogs.logs
  };
};

/**
 * Updates a user's account status (active, suspended, inactive) with mandatory reason and audit record.
 */
export const updateUserStatus = async ({
  userId,
  status,
  reason,
  adminUser,
  ipAddress = null
}) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid or missing user ID.");
  }

  const validStatuses = ["active", "suspended", "inactive"];
  if (!status || !validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Allowed: ${validStatuses.join(", ")}`);
  }

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    throw new Error("A reason is mandatory for administrative user status changes.");
  }

  // Prevent admin from changing their own status (cannot self-suspend)
  if (adminUser._id.toString() === userId.toString()) {
    throw new Error("Administrators cannot modify their own account status.");
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new Error("User not found.");
  }

  const previousStatus = targetUser.status;
  if (previousStatus === status) {
    return {
      user: targetUser,
      unchanged: true,
      message: `User is already ${status}.`
    };
  }

  targetUser.status = status;
  await targetUser.save();

  // Log administrative audit trail
  await logAdminAction({
    adminUser,
    action: "USER_STATUS_CHANGE",
    targetType: "USER",
    targetId: targetUser._id.toString(),
    details: {
      previousStatus,
      newStatus: status,
      targetEmail: targetUser.email
    },
    reason: reason.trim(),
    ipAddress
  });

  return {
    user: {
      id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      status: targetUser.status
    },
    message: `User status successfully updated from '${previousStatus}' to '${status}'.`
  };
};


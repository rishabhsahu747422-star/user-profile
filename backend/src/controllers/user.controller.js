import User from "../models/User.js";
import WalletTransaction from "../models/WalletTransaction.js";
import { getOrCreateWallet } from "../services/wallet.service.js";
import {
  getUserProgressionOverview,
  getUserAchievements
} from "../services/progression.service.js";
import { getUserReferralSummary } from "../services/referral.service.js";
import { getUserWithdrawalSummary } from "../services/withdrawal.service.js";

/**
 * Get authenticated user profile.
 * Identity is derived exclusively from the verified server-side authentication context (req.user).
 * Any client-supplied user identifiers or query parameters are ignored.
 */
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User profile not found."
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: `Account is ${user.status}. Access denied. Please contact support.`
      });
    }

    res.status(200).json({
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        referralCode: user.referralCode,
        memberSince: user.createdAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error("Get profile error:", error.message);
    res.status(500).json({
      message: "Server error retrieving user profile."
    });
  }
};

/**
 * Get authenticated user wallet balances.
 * Identity is derived exclusively from the verified server-side authentication context.
 */
export const getMyWallet = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user._id);

    res.status(200).json({
      wallet: wallet.toSafeObject()
    });
  } catch (error) {
    console.error("Get wallet error:", error.message);
    res.status(500).json({
      message: "Server error retrieving user wallet."
    });
  }
};

/**
 * Get unified profile overview for authenticated user.
 * Consolidates profile, wallet, levelProgress, achievements, referrals, withdrawals, and recentActivity.
 * Uses parallel queries for optimal performance without duplicating business logic.
 */
export const getMyOverview = async (req, res) => {
  try {
    const userId = req.user._id;

    const [user, wallet, progression, achievements, referrals, withdrawals, recentTransactions] =
      await Promise.all([
        User.findById(userId),
        getOrCreateWallet(userId),
        getUserProgressionOverview(userId),
        getUserAchievements(userId),
        getUserReferralSummary(userId),
        getUserWithdrawalSummary(userId),
        WalletTransaction.find({ userId }).sort({ createdAt: -1 }).limit(10).lean()
      ]);

    if (!user) {
      return res.status(404).json({
        message: "User profile not found."
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: `Account is ${user.status}. Access denied. Please contact support.`
      });
    }

    const safeProfile = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      referralCode: user.referralCode,
      memberSince: user.createdAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    const achievementSummary = {
      total: achievements.length,
      unlocked: achievements.filter((a) => a.unlocked).length,
      claimed: achievements.filter((a) => a.isClaimed).length,
      inProgress: achievements.filter((a) => !a.unlocked).length,
      items: achievements
    };

    const recentActivity = recentTransactions.map((tx) => ({
      id: tx._id,
      type: tx.type,
      assetType: tx.assetType,
      amount: tx.amount,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      description: tx.reason,
      timestamp: tx.createdAt
    }));

    res.status(200).json({
      success: true,
      profile: safeProfile,
      wallet: wallet.toSafeObject(),
      levelProgress: progression,
      achievements: achievementSummary,
      referrals,
      withdrawals,
      recentActivity
    });
  } catch (error) {
    console.error("Get overview error:", error.message);
    res.status(500).json({
      message: "Server error retrieving user overview."
    });
  }
};

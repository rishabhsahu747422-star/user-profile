import Withdrawal, { WITHDRAWAL_STATUSES } from "../models/Withdrawal.js";
import {
  reviewWithdrawalRequest,
  settleWithdrawalRequest
} from "../services/withdrawal.service.js";

/**
 * List all withdrawal requests across users with search & filters (Admin).
 */
export const listWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, userId } = req.query;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {};
    if (status && WITHDRAWAL_STATUSES.includes(status)) {
      query.status = status;
    }
    if (userId) {
      query.userId = userId;
    }

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate("userId", "name email role status")
        .populate("reviewedBy", "name email")
        .lean(),
      Withdrawal.countDocuments(query)
    ]);

    res.status(200).json({
      withdrawals,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit) || 1
      }
    });
  } catch (error) {
    console.error("Admin list withdrawals error:", error.message);
    res.status(500).json({ message: "Server error retrieving withdrawals list." });
  }
};

/**
 * Review withdrawal request: approve or reject with mandatory reason (Admin).
 */
export const reviewWithdrawal = async (req, res) => {
  try {
    const { decision, reason, adminNotes } = req.body;
    const withdrawal = await reviewWithdrawalRequest({
      withdrawalId: req.params.id,
      adminUser: req.user,
      decision,
      reason,
      adminNotes
    });

    res.status(200).json({
      message: `Withdrawal successfully ${decision}d.`,
      withdrawal
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * Settle withdrawal request: marks approved request as completed and settled (Admin).
 */
export const settleWithdrawal = async (req, res) => {
  try {
    const { reason } = req.body;
    const withdrawal = await settleWithdrawalRequest({
      withdrawalId: req.params.id,
      adminUser: req.user,
      reason
    });

    res.status(200).json({
      message: "Withdrawal successfully settled and marked completed.",
      withdrawal
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


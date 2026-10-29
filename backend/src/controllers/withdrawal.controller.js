import mongoose from "mongoose";
import {
  createWithdrawalRequest,
  getUserWithdrawalSummary,
  getUserWithdrawalHistory,
  getWithdrawalById,
  cancelWithdrawalRequest
} from "../services/withdrawal.service.js";
import { SUPPORTED_ASSETS } from "../models/Wallet.js";

/**
 * Creates a new withdrawal request for the authenticated user.
 * Reserves funds in user's wallet.
 */
export const createWithdrawal = async (req, res) => {
  try {
    const { amount, assetType = "VE", payoutMethod, payoutDetails, idempotencyKey } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({ message: "Amount is required." });
    }

    const numAmount = Number(amount);
    if (!Number.isInteger(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: `Withdrawal amount must be a positive integer. Got: ${amount}` });
    }

    if (!SUPPORTED_ASSETS.includes(assetType)) {
      return res.status(400).json({ message: `Unsupported asset type: ${assetType}. Must be one of: ${SUPPORTED_ASSETS.join(", ")}` });
    }

    if (!idempotencyKey || typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
      return res.status(400).json({ message: "idempotencyKey is required for withdrawal requests." });
    }

    const result = await createWithdrawalRequest({
      userId: req.user._id,
      assetType,
      amount: numAmount,
      payoutMethod: payoutMethod ? String(payoutMethod).trim() : "MANUAL",
      payoutDetails: typeof payoutDetails === "object" && payoutDetails !== null ? payoutDetails : {},
      idempotencyKey: idempotencyKey.trim()
    });

    res.status(result.isDuplicate ? 200 : 201).json(result);
  } catch (error) {
    if (
      error.message.includes("Insufficient") ||
      error.message.includes("locked") ||
      error.message.includes("integer") ||
      error.message.includes("Unsupported")
    ) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Create withdrawal error:", error.message);
    res.status(500).json({ message: "Server error creating withdrawal request." });
  }
};

/**
 * Returns withdrawal overview metrics for the authenticated user (Task 14 Section 11).
 */
export const getMyWithdrawalSummary = async (req, res) => {
  try {
    const summary = await getUserWithdrawalSummary(req.user._id);
    res.status(200).json({
      withdrawalSummary: summary
    });
  } catch (error) {
    console.error("Get withdrawal summary error:", error.message);
    res.status(500).json({ message: "Server error retrieving withdrawal summary." });
  }
};

/**
 * Returns paginated withdrawal history for the authenticated user.
 */
export const getMyWithdrawalHistory = async (req, res) => {
  try {
    const { page, limit, status } = req.query;
    const history = await getUserWithdrawalHistory(req.user._id, { page, limit, status });
    res.status(200).json(history);
  } catch (error) {
    console.error("Get withdrawal history error:", error.message);
    res.status(500).json({ message: "Server error retrieving withdrawal history." });
  }
};

/**
 * Retrieves single withdrawal details owned by the authenticated user.
 */
export const getMyWithdrawal = async (req, res) => {
  try {
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Withdrawal request not found." });
    }
    const withdrawal = await getWithdrawalById(req.user._id, req.params.id, false);
    res.status(200).json({ withdrawal });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * Cancels a pending withdrawal owned by the authenticated user.
 */
export const cancelMyWithdrawal = async (req, res) => {
  try {
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Withdrawal request not found." });
    }
    const { reason } = req.body;
    const withdrawal = await cancelWithdrawalRequest({
      userId: req.user._id,
      withdrawalId: req.params.id,
      reason
    });
    res.status(200).json({
      message: "Withdrawal request cancelled successfully and funds released.",
      withdrawal
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


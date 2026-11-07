import mongoose from "mongoose";
import crypto from "crypto";
import {
  createWithdrawalRequest,
  getUserWithdrawalSummary,
  getUserWithdrawalHistory,
  getWithdrawalById,
  cancelWithdrawalRequest
} from "../services/withdrawal.service.js";
import { SUPPORTED_ASSETS } from "../models/Wallet.js";
import { WITHDRAWAL_STATUSES } from "../models/Withdrawal.js";

/**
 * Creates a new withdrawal request for the authenticated user.
 * Reserves funds in user's wallet.
 */
export const createWithdrawal = async (req, res) => {
  try {
    const {
      amount,
      assetType = "VE",
      payoutMethod = "MANUAL",
      payoutDetails,
      destination,
      accountIdentifier,
      idempotencyKey
    } = req.body;

    if (amount === undefined || amount === null || String(amount).trim() === "") {
      return res.status(400).json({ message: "Amount is required." });
    }

    const numAmount = Number(amount);
    if (!Number.isInteger(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: `Withdrawal amount must be a positive integer. Got: ${amount}` });
    }

    if (!SUPPORTED_ASSETS.includes(assetType)) {
      return res.status(400).json({ message: `Unsupported asset type: ${assetType}. Must be one of: ${SUPPORTED_ASSETS.join(", ")}` });
    }

    // Extract and validate destination account/address
    const destinationAccount = (
      destination ||
      accountIdentifier ||
      (payoutDetails && typeof payoutDetails === "object" ? payoutDetails.accountIdentifier : "") ||
      ""
    ).trim();

    if (!destinationAccount) {
      return res.status(400).json({ message: "Destination account or payout address is required." });
    }

    if (destinationAccount.length > 100) {
      return res.status(400).json({ message: "Destination account cannot exceed 100 characters." });
    }

    // Resolve idempotencyKey from body, headers, or generate unique fallback
    let resolvedKey = (
      idempotencyKey ||
      req.headers["idempotency-key"] ||
      req.headers["x-idempotency-key"] ||
      ""
    );
    if (typeof resolvedKey === "string" && resolvedKey.trim()) {
      resolvedKey = resolvedKey.trim();
    } else {
      resolvedKey = `wd_${req.user._id}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    }

    const mergedPayoutDetails = {
      accountIdentifier: destinationAccount,
      ...(payoutDetails && typeof payoutDetails === "object" ? payoutDetails : {})
    };

    const result = await createWithdrawalRequest({
      userId: req.user._id,
      assetType,
      amount: numAmount,
      payoutMethod: payoutMethod ? String(payoutMethod).trim() : "MANUAL",
      payoutDetails: mergedPayoutDetails,
      idempotencyKey: resolvedKey
    });

    res.status(result.isDuplicate ? 200 : 201).json(result);
  } catch (error) {
    if (
      error.message.includes("Insufficient") ||
      error.message.includes("locked") ||
      error.message.includes("integer") ||
      error.message.includes("Unsupported") ||
      error.message.includes("required") ||
      error.message.includes("Destination")
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
    let { page, limit, status } = req.query;

    if (page !== undefined && page !== null && String(page).trim() !== "") {
      const p = Number(page);
      if (isNaN(p) || !Number.isInteger(p) || p < 1) {
        return res.status(400).json({ message: "Page must be a positive integer." });
      }
    }

    if (limit !== undefined && limit !== null && String(limit).trim() !== "") {
      const l = Number(limit);
      if (isNaN(l) || !Number.isInteger(l) || l < 1 || l > 100) {
        return res.status(400).json({ message: "Limit must be a positive integer between 1 and 100." });
      }
    }

    if (status !== undefined && status !== null && String(status).trim() !== "" && String(status).trim().toLowerCase() !== "all") {
      const s = String(status).trim().toLowerCase();
      if (!WITHDRAWAL_STATUSES.includes(s)) {
        return res.status(400).json({
          message: `Invalid status filter '${status}'. Allowed statuses: ${WITHDRAWAL_STATUSES.join(", ")}`
        });
      }
      status = s;
    } else {
      status = null;
    }

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


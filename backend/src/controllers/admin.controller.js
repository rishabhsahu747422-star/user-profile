import {
  getAdminOverview,
  getAdminUsers,
  getAdminUserDetails,
  updateUserStatus
} from "../services/admin.service.js";
import { getAuditLogs } from "../services/audit.service.js";
import Withdrawal from "../models/Withdrawal.js";

/**
 * Platform overview metrics for administrators.
 */
export const getOverview = async (req, res) => {
  try {
    const overview = await getAdminOverview();
    res.status(200).json(overview);
  } catch (error) {
    console.error("Admin overview error:", error.message);
    res.status(500).json({ message: "Server error retrieving administrative overview." });
  }
};

/**
 * Lists paginated users with optional search and filters.
 */
export const listUsers = async (req, res) => {
  try {
    const { page, limit, search, status, role, sortBy, sortOrder } = req.query;
    const result = await getAdminUsers({
      page,
      limit,
      search,
      status,
      role,
      sortBy,
      sortOrder
    });
    res.status(200).json(result);
  } catch (error) {
    console.error("Admin list users error:", error.message);
    res.status(500).json({ message: "Server error retrieving users list." });
  }
};

/**
 * Returns detailed user profile and reward summaries for a specific user.
 */
export const getUserDetails = async (req, res) => {
  try {
    const userDetails = await getAdminUserDetails(req.params.id);
    res.status(200).json(userDetails);
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
};

/**
 * Updates a user's account status (active, suspended, inactive).
 */
export const changeUserStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress || null;

    const result = await updateUserStatus({
      userId: req.params.id,
      status,
      reason,
      adminUser: req.user,
      ipAddress
    });

    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ message: error.message });
  }
};

/**
 * Retrieves paginated platform audit logs.
 */
export const listAuditLogs = async (req, res) => {
  try {
    const { page, limit, action, targetType, targetId, adminId } = req.query;
    const result = await getAuditLogs({
      page,
      limit,
      action,
      targetType,
      targetId,
      adminId
    });
    res.status(200).json(result);
  } catch (error) {
    console.error("Admin list audit logs error:", error.message);
    res.status(500).json({ message: "Server error retrieving audit logs." });
  }
};

/**
 * Retrieves full details of a specific withdrawal request.
 */
export const getWithdrawalDetails = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id)
      .populate("userId", "name email role status referralCode")
      .populate("reviewedBy", "name email role")
      .populate("holdTransactionId")
      .populate("releaseTransactionId")
      .populate("settleTransactionId")
      .lean();

    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal request not found." });
    }

    res.status(200).json({ withdrawal });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


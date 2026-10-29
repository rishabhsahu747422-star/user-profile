import { Router } from "express";
import {
  getOverview,
  listUsers,
  getUserDetails,
  changeUserStatus,
  listAuditLogs,
  getWithdrawalDetails
} from "../controllers/admin.controller.js";
import {
  listWithdrawals,
  reviewWithdrawal,
  settleWithdrawal
} from "../controllers/admin.withdrawal.controller.js";
import { authenticateUser, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Protect ALL admin endpoints with authentication and administrator authorization
router.use(authenticateUser, requireAdmin);

// Platform Overview
router.get("/overview", getOverview);

// User Management
router.get("/users", listUsers);
router.get("/users/:id", getUserDetails);
router.patch("/users/:id/status", changeUserStatus);

// Withdrawal Management
router.get("/withdrawals", listWithdrawals);
router.get("/withdrawals/:id", getWithdrawalDetails);
router.post("/withdrawals/:id/review", reviewWithdrawal);
router.post("/withdrawals/:id/settle", settleWithdrawal);

// Audit Logs
router.get("/audit-logs", listAuditLogs);

export default router;

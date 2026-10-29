import { Router } from "express";
import {
  listWithdrawals,
  reviewWithdrawal,
  settleWithdrawal
} from "../controllers/admin.withdrawal.controller.js";
import { authenticateUser, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Protect all admin endpoints with authentication and administrator authorization
router.use(authenticateUser, requireAdmin);

router.get("/withdrawals", listWithdrawals);
router.post("/withdrawals/:id/review", reviewWithdrawal);
router.post("/withdrawals/:id/settle", settleWithdrawal);

export default router;


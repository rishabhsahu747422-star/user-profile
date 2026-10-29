import { Router } from "express";
import { getMyProfile, getMyWallet } from "../controllers/user.controller.js";
import {
  getMyProgress,
  getMyAchievements,
  claimAchievement
} from "../controllers/progression.controller.js";
import {
  getMyReferralSummary,
  getMyReferralHistory
} from "../controllers/referral.controller.js";
import {
  createWithdrawal,
  getMyWithdrawalSummary,
  getMyWithdrawalHistory,
  getMyWithdrawal,
  cancelMyWithdrawal
} from "../controllers/withdrawal.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me/profile", authenticateUser, getMyProfile);
router.get("/me/wallet", authenticateUser, getMyWallet);
router.get("/me/progress", authenticateUser, getMyProgress);
router.get("/me/achievements", authenticateUser, getMyAchievements);
router.post("/me/achievements/:id/claim", authenticateUser, claimAchievement);
router.get("/me/referrals", authenticateUser, getMyReferralSummary);
router.get("/me/referrals/history", authenticateUser, getMyReferralHistory);
router.post("/me/withdrawals", authenticateUser, createWithdrawal);
router.get("/me/withdrawals/summary", authenticateUser, getMyWithdrawalSummary);
router.get("/me/withdrawals", authenticateUser, getMyWithdrawalHistory);
router.get("/me/withdrawals/:id", authenticateUser, getMyWithdrawal);
router.post("/me/withdrawals/:id/cancel", authenticateUser, cancelMyWithdrawal);

export default router;

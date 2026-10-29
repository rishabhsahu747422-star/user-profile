import { Router } from "express";
import { validateCode } from "../controllers/referral.controller.js";

const router = Router();

// Public validation of referral codes (e.g., during registration)
router.get("/validate/:code", validateCode);

export default router;


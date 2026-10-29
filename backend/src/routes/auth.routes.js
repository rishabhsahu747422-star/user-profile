import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", authenticateUser, getMe);

export default router;


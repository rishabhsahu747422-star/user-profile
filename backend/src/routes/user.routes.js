import { Router } from "express";
import { getMyProfile } from "../controllers/user.controller.js";
import { authenticateUser } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me/profile", authenticateUser, getMyProfile);

export default router;


import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/health", (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? "ok" : "degraded",
    service: "VE Loop Rewards API",
    database: {
      connected: isDbConnected,
      status: isDbConnected ? "connected" : "disconnected"
    },
    timestamp: new Date().toISOString()
  });
});

export default router;


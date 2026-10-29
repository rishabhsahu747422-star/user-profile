import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

/**
 * Liveness Probe: GET /health (or /api/health)
 * Confirms that the Node.js application process is up and accepting HTTP traffic.
 * Does not depend on external services so the process is not killed during temporary network blips.
 */
router.get("/health", (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? "ok" : "degraded",
    service: "VE Loop Rewards API",
    uptime: Math.floor(process.uptime()),
    database: {
      connected: isDbConnected,
      status: isDbConnected ? "connected" : "disconnected"
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness Probe: GET /ready (or /api/ready)
 * Confirms that the application and its critical dependencies (MongoDB) are ready to handle requests.
 * Returns HTTP 200 if connected, HTTP 503 if database is disconnected or connecting.
 */
router.get("/ready", (req, res) => {
  const readyState = mongoose.connection.readyState;
  // 1 = connected, 0 = disconnected, 2 = connecting, 3 = disconnecting
  const isReady = readyState === 1;

  const stateLabels = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  const status = isReady ? 200 : 503;

  res.status(status).json({
    ready: isReady,
    status: isReady ? "ready" : "not_ready",
    service: "VE Loop Rewards API",
    dependencies: {
      database: {
        status: stateLabels[readyState] || "unknown",
        ready: isReady
      }
    },
    timestamp: new Date().toISOString()
  });
});

export default router;

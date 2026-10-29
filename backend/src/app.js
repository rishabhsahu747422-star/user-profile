import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import referralRoutes from "./routes/referral.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import { requestLogger } from "./middleware/logger.middleware.js";

dotenv.config();

const app = express();

// Disable X-Powered-By to prevent fingerprinting
app.disable("x-powered-by");

// Reverse proxy trust configuration
if (process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

// Structured request logging & correlation IDs
app.use(requestLogger);

// Standard OWASP Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';"
  );
  next();
});

// Parse CORS allowed origins (supports comma-separated list)
const rawClientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const allowedOrigins = rawClientUrl.includes(",")
  ? rawClientUrl.split(",").map((o) => o.trim()).filter(Boolean)
  : rawClientUrl;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Root health & readiness probes (unauthenticated, unthrottled for load balancers)
app.use("/", healthRoutes);

// General API rate limiter
app.use("/api", apiLimiter);

// App Route Mounts
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/admin", adminRoutes);

// Catch-all 404 handler for API routes
app.use("/api", (req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled API error:", err.message);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "An unexpected internal server error occurred.",
    requestId: req.id || null
  });
});

export default app;

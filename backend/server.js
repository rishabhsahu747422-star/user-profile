import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load .env from backend directory as well as process.cwd()
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config();

import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { validateEnv } from "./src/config/env.js";
import mongoose from "mongoose";

// Validate environment variables and fail fast if invalid
const env = validateEnv();

const port = env.PORT;

let server;

const startServer = async () => {
  try {
    // 1. Bind and listen immediately on 0.0.0.0 so Render port detection succeeds
    server = app.listen(port, "0.0.0.0", () => {
      console.log(`[INFO] Server running on http://0.0.0.0:${port} in '${env.NODE_ENV}' mode`);
    });

    // 2. Connect to MongoDB
    await connectDB();
  } catch (error) {
    console.error("[FATAL] Failed to start server due to database connection error:", error.message);
    if (server) {
      server.close(() => process.exit(1));
    } else {
      process.exit(1);
    }
  }
};

// Graceful Shutdown Handler
const handleGracefulShutdown = (signal) => {
  console.log(`\n[INFO] Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log("[INFO] HTTP server closed.");
      try {
        await mongoose.connection.close(false);
        console.log("[INFO] MongoDB connection closed.");
        process.exit(0);
      } catch (err) {
        console.error("[ERROR] Error closing MongoDB connection:", err.message);
        process.exit(1);
      }
    });

    // Force close after 10 seconds if graceful shutdown takes too long
    setTimeout(() => {
      console.error("[WARN] Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));

startServer();

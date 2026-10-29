import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";

dotenv.config();

const app = express();

const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: clientOrigin,
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

export default app;

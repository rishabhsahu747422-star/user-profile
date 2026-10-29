import mongoose from "mongoose";
import User from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required. No Bearer token provided."
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token || !token.trim()) {
      return res.status(401).json({ message: "Authentication token missing." });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token has expired. Please log in again." });
      }
      return res.status(401).json({ message: "Invalid authentication token." });
    }

    if (!decoded || !decoded.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      return res.status(401).json({ message: "Invalid authentication token." });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User account no longer exists." });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: `Account is ${user.status}. Access denied. Please contact support.`
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication middleware error:", error.message);
    res.status(500).json({ message: "Server error during authentication." });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access denied. Administrator privileges required."
    });
  }
  next();
};


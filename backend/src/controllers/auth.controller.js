import User from "../models/User.js";
import { generateToken } from "../utils/jwt.js";
import { getOrCreateWallet } from "../services/wallet.service.js";
import { getOrCreateUserProgress } from "../services/progression.service.js";
import {
  validateReferralCode,
  createReferralRelationship
} from "../services/referral.service.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = async (req, res) => {
  try {
    const { name, email, password, referralCode } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({
        message: "Name is required and must be at least 2 characters long."
      });
    }

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        message: "A valid email address is required."
      });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        message: "Password is required and must be at least 6 characters long."
      });
    }

    // Optional referral code validation
    if (referralCode && typeof referralCode === "string" && referralCode.trim()) {
      const codeValidation = await validateReferralCode(referralCode.trim());
      if (!codeValidation.valid) {
        return res.status(400).json({
          message: codeValidation.message
        });
      }
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered."
      });
    }

    // Role and status are strictly controlled; public users cannot register as admin or choose status
    const user = new User({
      name: normalizedName,
      email: normalizedEmail,
      password,
      role: "user",
      status: "active"
    });

    await user.save();

    // Auto-provision zero-balance wallet and user progression for new user
    await getOrCreateWallet(user._id);
    await getOrCreateUserProgress(user._id);

    // Establish referral relationship if valid referralCode was provided
    if (referralCode && typeof referralCode === "string" && referralCode.trim()) {
      await createReferralRelationship({
        referralCode: referralCode.trim(),
        referredUserId: user._id
      });
    }

    const token = generateToken({ id: user._id, role: user.role });

    res.status(201).json({
      message: "Registration successful.",
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email is already registered." });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    console.error("Registration error:", error.message);
    res.status(500).json({ message: "Server error during registration." });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "Email and password must be valid text strings."
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: `Account is ${user.status}. Access denied. Please contact support.`
      });
    }

    const token = generateToken({ id: user._id, role: user.role });

    res.status(200).json({
      message: "Login successful.",
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Server error during login." });
  }
};

export const getMe = async (req, res) => {
  try {
    res.status(200).json({
      user: req.user.toSafeObject()
    });
  } catch (error) {
    console.error("GetMe error:", error.message);
    res.status(500).json({ message: "Server error retrieving user data." });
  }
};

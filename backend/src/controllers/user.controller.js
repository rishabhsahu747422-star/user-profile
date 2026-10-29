import User from "../models/User.js";
import { getOrCreateWallet } from "../services/wallet.service.js";

/**
 * Get authenticated user profile.
 * Identity is derived exclusively from the verified server-side authentication context (req.user).
 * Any client-supplied user identifiers or query parameters are ignored.
 */
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User profile not found."
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: `Account is ${user.status}. Access denied. Please contact support.`
      });
    }

    res.status(200).json({
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        referralCode: user.referralCode,
        memberSince: user.createdAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error("Get profile error:", error.message);
    res.status(500).json({
      message: "Server error retrieving user profile."
    });
  }
};

/**
 * Get authenticated user wallet balances.
 * Identity is derived exclusively from the verified server-side authentication context.
 */
export const getMyWallet = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user._id);

    res.status(200).json({
      wallet: wallet.toSafeObject()
    });
  } catch (error) {
    console.error("Get wallet error:", error.message);
    res.status(500).json({
      message: "Server error retrieving user wallet."
    });
  }
};

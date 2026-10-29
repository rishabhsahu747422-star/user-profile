import {
  getUserProgressionOverview,
  getUserAchievements,
  claimAchievementReward
} from "../services/progression.service.js";

/**
 * Get authenticated user progression (Level & XP).
 * Identity is derived exclusively from req.user._id (JWT authentication).
 */
export const getMyProgress = async (req, res) => {
  try {
    const progression = await getUserProgressionOverview(req.user._id);
    res.status(200).json({
      levelProgress: progression
    });
  } catch (error) {
    console.error("Get progression error:", error.message);
    res.status(500).json({
      message: "Server error retrieving progression data."
    });
  }
};

/**
 * Get authenticated user achievements with unlock and claim status.
 * Identity is derived exclusively from req.user._id.
 */
export const getMyAchievements = async (req, res) => {
  try {
    const achievements = await getUserAchievements(req.user._id);
    res.status(200).json({
      achievements
    });
  } catch (error) {
    console.error("Get achievements error:", error.message);
    res.status(500).json({
      message: "Server error retrieving achievements."
    });
  }
};

/**
 * Claim an unlocked achievement reward.
 * Identity is derived exclusively from req.user._id.
 */
export const claimAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await claimAchievementReward(req.user._id, id);
    res.status(200).json({
      message: "Achievement claimed successfully.",
      ...result
    });
  } catch (error) {
    if (
      error.message.includes("not unlocked") ||
      error.message.includes("already been claimed")
    ) {
      return res.status(400).json({
        message: error.message
      });
    }
    console.error("Claim achievement error:", error.message);
    res.status(500).json({
      message: "Server error claiming achievement."
    });
  }
};


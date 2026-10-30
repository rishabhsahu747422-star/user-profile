import mongoose from "mongoose";
import UserProgress from "../models/UserProgress.js";
import LevelConfiguration from "../models/LevelConfiguration.js";
import Achievement from "../models/Achievement.js";
import UserAchievement from "../models/UserAchievement.js";
import XpTransaction from "../models/XpTransaction.js";
import { isTransactionSupported } from "./wallet.service.js";

/**
 * Baseline default level definitions derived from the assignment specification examples.
 */
export const DEFAULT_LEVELS = [
  { levelNumber: 1, name: "Novice", minXp: 0, badge: "badge_level_1", description: "Beginning your rewards journey" },
  { levelNumber: 2, name: "Bronze Explorer", minXp: 1000, badge: "badge_level_2", description: "Exploring reward opportunities" },
  { levelNumber: 3, name: "Silver Adventurer", minXp: 3000, badge: "badge_level_3", description: "Actively collecting rewards and completing tasks" },
  { levelNumber: 4, name: "Reward Explorer", minXp: 6000, badge: "badge_level_4", description: "Experienced rewards explorer" },
  { levelNumber: 5, name: "Gold Champion", minXp: 8000, badge: "badge_level_5", description: "High-tier rewards earner" },
  { levelNumber: 6, name: "Platinum Elite", minXp: 12000, badge: "badge_level_6", description: "Elite status platform veteran" },
  { levelNumber: 7, name: "Diamond Master", minXp: 20000, badge: "badge_level_7", description: "Master rewards collector" }
];

/**
 * Baseline default achievements derived from the assignment specification examples.
 */
export const DEFAULT_ACHIEVEMENTS = [
  {
    code: "ACH_WELCOME",
    title: "Welcome to VE Loop",
    description: "Successfully activate your account and join VE Loop Rewards",
    category: "PROFILE",
    artwork: "badge_welcome",
    criteria: { type: "CUSTOM", targetValue: 1 },
    rewards: []
  },
  {
    code: "ACH_BRONZE_HUNTER",
    title: "Bronze Reward Hunter",
    description: "Earn 1,000 lifetime XP",
    category: "XP",
    artwork: "badge_bronze_hunter",
    criteria: { type: "XP_THRESHOLD", targetValue: 1000 },
    rewards: []
  },
  {
    code: "ACH_SILVER_HUNTER",
    title: "Silver Reward Hunter",
    description: "Earn 3,000 lifetime XP",
    category: "XP",
    artwork: "badge_silver_hunter",
    criteria: { type: "XP_THRESHOLD", targetValue: 3000 },
    rewards: []
  },
  {
    code: "ACH_GOLD_HUNTER",
    title: "Gold Reward Hunter",
    description: "Earn 6,000 lifetime XP",
    category: "XP",
    artwork: "badge_gold_hunter",
    criteria: { type: "XP_THRESHOLD", targetValue: 6000 },
    rewards: []
  },
  {
    code: "ACH_PLATINUM_HUNTER",
    title: "Platinum Reward Hunter",
    description: "Earn 8,500 lifetime XP",
    category: "XP",
    artwork: "badge_platinum_hunter",
    criteria: { type: "XP_THRESHOLD", targetValue: 8500 },
    rewards: []
  }
];

/**
 * Seeds default level configurations and achievements if none exist.
 */
export const seedDefaultProgressionConfigs = async () => {
  const levelCount = await LevelConfiguration.countDocuments();
  if (levelCount === 0) {
    await LevelConfiguration.insertMany(DEFAULT_LEVELS);
  }

  const achievementCount = await Achievement.countDocuments();
  if (achievementCount === 0) {
    await Achievement.insertMany(DEFAULT_ACHIEVEMENTS);
  }
};

/**
 * Retrieves or initializes the progression record for a user.
 */
export const getOrCreateUserProgress = async (userId, session = null) => {
  if (!userId) {
    throw new Error("userId is required to get or create progression.");
  }

  let progress = await UserProgress.findOne({ userId }).session(session);
  if (progress) {
    return progress;
  }

  try {
    const newProgress = new UserProgress({
      userId,
      currentXp: 0,
      currentLevel: 1,
      totalXpEarned: 0
    });
    await newProgress.save({ session });
    return newProgress;
  } catch (error) {
    if (error.code === 11000) {
      return UserProgress.findOne({ userId }).session(session);
    }
    throw error;
  }
};

/**
 * Computes level progress details from the database-backed LevelConfiguration.
 */
export const calculateLevelForXp = async (xp) => {
  await seedDefaultProgressionConfigs();

  const levels = await LevelConfiguration.find({ isActive: true }).sort({ minXp: 1 });

  let currentLevelConfig = levels[0] || { levelNumber: 1, name: "Novice", minXp: 0 };
  let nextLevelConfig = null;

  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i].minXp) {
      currentLevelConfig = levels[i];
      nextLevelConfig = levels[i + 1] || null;
    } else {
      break;
    }
  }

  const currentLevel = currentLevelConfig.levelNumber;
  const currentLevelName = currentLevelConfig.name;
  const currentLevelMinXp = currentLevelConfig.minXp;

  let nextLevel = null;
  let nextLevelName = null;
  let nextLevelXp = null;
  let xpRemaining = 0;
  let progressPercentage = 100;

  if (nextLevelConfig) {
    nextLevel = nextLevelConfig.levelNumber;
    nextLevelName = nextLevelConfig.name;
    nextLevelXp = nextLevelConfig.minXp;
    xpRemaining = Math.max(0, nextLevelXp - xp);
    const range = nextLevelXp - currentLevelMinXp;
    const progressInRange = xp - currentLevelMinXp;
    progressPercentage = range > 0 ? Math.min(100, Math.max(0, Math.round((progressInRange / range) * 100))) : 0;
  }

  return {
    currentLevel,
    currentLevelName,
    currentLevelMinXp,
    nextLevel,
    nextLevelName,
    nextLevelXp,
    xpRemaining,
    progressPercentage,
    badge: currentLevelConfig.badge
  };
};

/**
 * Checks and unlocks eligible achievements for a user.
 */
export const checkAndUnlockAchievements = async (userId, userProgress, session = null) => {
  await seedDefaultProgressionConfigs();

  const achievements = await Achievement.find({ isActive: true }).session(session);
  const userAchievements = await UserAchievement.find({ userId }).session(session);

  const uaMap = new Map();
  for (const ua of userAchievements) {
    uaMap.set(ua.achievementId.toString(), ua);
  }

  const newlyUnlocked = [];

  for (const ach of achievements) {
    let eligible = false;
    let progressVal = 0;

    if (ach.criteria.type === "XP_THRESHOLD") {
      progressVal = userProgress.totalXpEarned;
      if (userProgress.totalXpEarned >= ach.criteria.targetValue) {
        eligible = true;
      }
    } else if (ach.criteria.type === "CUSTOM" && ach.code === "ACH_WELCOME") {
      progressVal = 1;
      eligible = true;
    }

    const setOnInsert = {
      userId,
      achievementId: ach._id,
      isClaimed: false
    };

    const updateDoc = {
      $max: { progress: progressVal },
      $setOnInsert: setOnInsert
    };

    if (eligible) {
      updateDoc.$set = {
        unlocked: true
      };
      // Ensure unlockedAt is set when unlocking
      setOnInsert.unlockedAt = new Date();
    }

    const prevUa = uaMap.get(ach._id.toString());

    // Atomic findOneAndUpdate with upsert handles concurrency cleanly
    const updatedUa = await UserAchievement.findOneAndUpdate(
      { userId, achievementId: ach._id },
      updateDoc,
      { upsert: true, returnDocument: "after", session }
    );

    if (updatedUa.unlocked && (!prevUa || !prevUa.unlocked)) {
      if (!updatedUa.unlockedAt) {
        updatedUa.unlockedAt = new Date();
        await updatedUa.save({ session });
      }
      newlyUnlocked.push(ach);
    }
  }

  return newlyUnlocked;
};

/**
 * Awards XP to a user with full idempotency and level recalculation.
 */
export const awardXp = async ({
  userId,
  amount,
  reason,
  referenceType = "SYSTEM",
  referenceId = null,
  idempotencyKey
}) => {
  if (!userId) throw new Error("userId is required for awarding XP.");
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`XP amount must be a positive integer. Got: ${amount}`);
  }
  if (!idempotencyKey || typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
    throw new Error("idempotencyKey is required for XP operations.");
  }
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    throw new Error("XP award reason is required.");
  }

  // 1. Idempotency check
  const existingTx = await XpTransaction.findOne({ idempotencyKey: idempotencyKey.trim() });
  if (existingTx) {
    const progress = await getOrCreateUserProgress(userId);
    return {
      transaction: existingTx,
      isDuplicate: true,
      currentXp: progress.currentXp,
      currentLevel: progress.currentLevel
    };
  }

  const progress = await getOrCreateUserProgress(userId);

  if (isTransactionSupported()) {
    // Multi-Document Transaction path
    const session = await mongoose.startSession();
    try {
      let resultTx;
      let newLevel;
      let newlyUnlocked = [];

      await session.withTransaction(async () => {
        const lockedProgress = await UserProgress.findOne({ _id: progress._id }).session(session);
        const xpBefore = lockedProgress.currentXp;
        lockedProgress.currentXp += amount;
        lockedProgress.totalXpEarned += amount;
        const xpAfter = lockedProgress.currentXp;

        const levelInfo = await calculateLevelForXp(lockedProgress.totalXpEarned);
        newLevel = levelInfo.currentLevel;
        lockedProgress.currentLevel = newLevel;

        await lockedProgress.save({ session });

        const tx = new XpTransaction({
          userId,
          amount,
          xpBefore,
          xpAfter,
          reason: reason.trim(),
          referenceType,
          referenceId,
          idempotencyKey: idempotencyKey.trim()
        });

        await tx.save({ session });
        resultTx = tx;

        newlyUnlocked = await checkAndUnlockAchievements(userId, lockedProgress, session);
      });

      return {
        transaction: resultTx,
        isDuplicate: false,
        newLevel,
        newlyUnlocked
      };
    } finally {
      await session.endSession();
    }
  } else {
    // Standalone fallback: Atomic increment + compensating rollback
    const xpBefore = progress.currentXp;

    const updatedProgress = await UserProgress.findOneAndUpdate(
      { _id: progress._id },
      {
        $inc: {
          currentXp: amount,
          totalXpEarned: amount
        }
      },
      { returnDocument: "after" }
    );

    const xpAfter = updatedProgress.currentXp;

    try {
      const tx = new XpTransaction({
        userId,
        amount,
        xpBefore,
        xpAfter,
        reason: reason.trim(),
        referenceType,
        referenceId,
        idempotencyKey: idempotencyKey.trim()
      });

      await tx.save();

      const levelInfo = await calculateLevelForXp(updatedProgress.totalXpEarned);
      if (updatedProgress.currentLevel !== levelInfo.currentLevel) {
        updatedProgress.currentLevel = levelInfo.currentLevel;
        await updatedProgress.save();
      }

      const newlyUnlocked = await checkAndUnlockAchievements(userId, updatedProgress);

      return {
        transaction: tx,
        isDuplicate: false,
        newLevel: updatedProgress.currentLevel,
        newlyUnlocked
      };
    } catch (err) {
      // Compensating reversal on failure
      await UserProgress.findByIdAndUpdate(progress._id, {
        $inc: {
          currentXp: -amount,
          totalXpEarned: -amount
        }
      });
      throw err;
    }
  }
};

/**
 * Returns full level and XP progression data for the user profile.
 */
export const getUserProgressionOverview = async (userId) => {
  const progress = await getOrCreateUserProgress(userId);
  const levelInfo = await calculateLevelForXp(progress.totalXpEarned);

  // Sync currentLevel in record if changed by config update
  if (progress.currentLevel !== levelInfo.currentLevel) {
    progress.currentLevel = levelInfo.currentLevel;
    await progress.save();
  }

  return {
    currentXp: progress.currentXp,
    totalXpEarned: progress.totalXpEarned,
    ...levelInfo
  };
};

/**
 * Returns list of achievements for a user with unlock and claim status.
 */
export const getUserAchievements = async (userId) => {
  await seedDefaultProgressionConfigs();
  const progress = await getOrCreateUserProgress(userId);
  await checkAndUnlockAchievements(userId, progress);

  const achievements = await Achievement.find({ isActive: true }).sort({ "criteria.targetValue": 1 });
  const userAchievements = await UserAchievement.find({ userId });

  const uaMap = new Map();
  for (const ua of userAchievements) {
    uaMap.set(ua.achievementId.toString(), ua);
  }

  return achievements.map((ach) => {
    const ua = uaMap.get(ach._id.toString());
    return {
      id: ach._id,
      code: ach.code,
      title: ach.title,
      description: ach.description,
      artwork: ach.artwork,
      category: ach.category,
      criteria: ach.criteria,
      rewards: ach.rewards,
      progress: ua ? ua.progress : 0,
      unlocked: ua ? ua.unlocked : false,
      unlockedAt: ua ? ua.unlockedAt : null,
      isClaimed: ua ? ua.isClaimed : false,
      claimedAt: ua ? ua.claimedAt : null
    };
  });
};

/**
 * Claims an unlocked achievement.
 * As per Phase 3 rules, financial wallet reward crediting is pending explicit business approval.
 */
export const claimAchievementReward = async (userId, achievementId) => {
  if (!userId || !achievementId) {
    throw new Error("userId and achievementId are required.");
  }

  // Atomic check-and-update to prevent race conditions during concurrent claims
  const updatedUserAch = await UserAchievement.findOneAndUpdate(
    { userId, achievementId, unlocked: true, isClaimed: false },
    { $set: { isClaimed: true, claimedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!updatedUserAch) {
    const existing = await UserAchievement.findOne({ userId, achievementId });
    if (!existing || !existing.unlocked) {
      throw new Error("Achievement is not unlocked yet.");
    }
    if (existing.isClaimed) {
      throw new Error("Achievement reward has already been claimed.");
    }
    throw new Error("Unable to claim achievement.");
  }

  return {
    success: true,
    achievementId,
    claimedAt: updatedUserAch.claimedAt
  };
};

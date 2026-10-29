import mongoose from "mongoose";

const userAchievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true
    },
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Achievement",
      required: [true, "Achievement reference is required"],
      index: true
    },
    progress: {
      type: Number,
      default: 0,
      min: [0, "Progress cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Progress must be an integer"
      }
    },
    unlocked: {
      type: Boolean,
      default: false,
      index: true
    },
    unlockedAt: {
      type: Date,
      default: null
    },
    isClaimed: {
      type: Boolean,
      default: false,
      index: true
    },
    claimedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Ensure a user cannot have duplicate tracking records for the same achievement
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

const UserAchievement = mongoose.model(
  "UserAchievement",
  userAchievementSchema
);

export default UserAchievement;


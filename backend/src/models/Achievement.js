import mongoose from "mongoose";
import { SUPPORTED_ASSETS } from "./Wallet.js";

const rewardSchema = new mongoose.Schema(
  {
    assetType: {
      type: String,
      enum: {
        values: SUPPORTED_ASSETS,
        message: "Unsupported reward asset type: {VALUE}"
      },
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Reward amount must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Reward amount must be an integer"
      }
    }
  },
  { _id: false }
);

const achievementSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Unique achievement code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    title: {
      type: String,
      required: [true, "Achievement title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"]
    },
    description: {
      type: String,
      required: [true, "Achievement description is required"],
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters"]
    },
    artwork: {
      type: String,
      default: "default_badge",
      trim: true
    },
    category: {
      type: String,
      enum: ["XP", "PROFILE", "REFERRAL", "MILESTONE"],
      default: "XP"
    },
    criteria: {
      type: {
        type: String,
        enum: ["XP_THRESHOLD", "CUSTOM"],
        default: "XP_THRESHOLD",
        required: true
      },
      targetValue: {
        type: Number,
        required: true,
        min: [0, "Criteria target value cannot be negative"],
        validate: {
          validator: Number.isInteger,
          message: "Criteria target value must be an integer"
        }
      }
    },
    rewards: {
      type: [rewardSchema],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
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

const Achievement = mongoose.model("Achievement", achievementSchema);

export default Achievement;


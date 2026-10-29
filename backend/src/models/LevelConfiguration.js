import mongoose from "mongoose";

const levelConfigurationSchema = new mongoose.Schema(
  {
    levelNumber: {
      type: Number,
      required: [true, "Level number is required"],
      unique: true,
      min: [1, "Level number must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Level number must be an integer"
      }
    },
    name: {
      type: String,
      required: [true, "Level name is required"],
      trim: true,
      maxlength: [100, "Level name cannot exceed 100 characters"]
    },
    minXp: {
      type: Number,
      required: [true, "Minimum XP threshold is required"],
      min: [0, "Minimum XP cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Minimum XP must be an integer"
      }
    },
    badge: {
      type: String,
      default: "default_badge",
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [250, "Description cannot exceed 250 characters"]
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

// Index to quickly sort levels by threshold
levelConfigurationSchema.index({ minXp: 1, isActive: 1 });

const LevelConfiguration = mongoose.model(
  "LevelConfiguration",
  levelConfigurationSchema
);

export default LevelConfiguration;


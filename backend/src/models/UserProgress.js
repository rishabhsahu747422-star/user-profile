import mongoose from "mongoose";

const userProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Progression record must be associated with a user"],
      unique: true,
      index: true
    },
    currentXp: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Current XP cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Current XP must be an integer"
      }
    },
    currentLevel: {
      type: Number,
      required: true,
      default: 1,
      min: [1, "Current level cannot be less than 1"],
      validate: {
        validator: Number.isInteger,
        message: "Current level must be an integer"
      }
    },
    totalXpEarned: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Total XP earned cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Total XP earned must be an integer"
      }
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

userProgressSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    userId: this.userId,
    currentXp: this.currentXp,
    currentLevel: this.currentLevel,
    totalXpEarned: this.totalXpEarned,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const UserProgress = mongoose.model("UserProgress", userProgressSchema);

export default UserProgress;


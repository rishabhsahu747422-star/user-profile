import mongoose from "mongoose";

export const REFERRAL_STATUSES = ["pending", "qualified", "rewarded", "rejected"];

export const ALLOWED_STATUS_TRANSITIONS = {
  pending: ["qualified", "rejected"],
  qualified: ["rewarded", "rejected"],
  rewarded: [],
  rejected: []
};

const statusHistorySchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      enum: REFERRAL_STATUSES,
      required: true
    },
    toStatus: {
      type: String,
      enum: REFERRAL_STATUSES,
      required: true
    },
    reason: {
      type: String,
      default: "Status updated",
      trim: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: String,
      default: "SYSTEM"
    }
  },
  { _id: false }
);

const referralSchema = new mongoose.Schema(
  {
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Referrer ID is required"],
      index: true
    },
    referredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Referred user ID is required"],
      unique: true, // Crucial: Exactly one referral relationship per referred user
      index: true,
      validate: {
        validator: function (val) {
          if (!this.referrerId || !val) return true;
          return this.referrerId.toString() !== val.toString();
        },
        message: "Self-referral is strictly prohibited."
      }
    },
    referralCode: {
      type: String,
      required: [true, "Referral code used is required"],
      uppercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: REFERRAL_STATUSES,
        message: "Invalid referral status: {VALUE}"
      },
      default: "pending",
      index: true
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: []
    },
    qualifiedAt: {
      type: Date,
      default: null
    },
    rewardedAt: {
      type: Date,
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true
    },
    rewardDetails: {
      assetType: {
        type: String,
        default: null
      },
      amount: {
        type: Number,
        default: null
      },
      transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WalletTransaction",
        default: null
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

// Compound index for querying referrals by referrer and status
referralSchema.index({ referrerId: 1, status: 1, createdAt: -1 });

const Referral = mongoose.model("Referral", referralSchema);

export default Referral;


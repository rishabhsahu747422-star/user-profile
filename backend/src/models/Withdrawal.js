import mongoose from "mongoose";
import crypto from "crypto";
import { SUPPORTED_ASSETS } from "./Wallet.js";

export const WITHDRAWAL_STATUSES = [
  "pending",
  "approved",
  "completed",
  "rejected",
  "cancelled"
];

export const ALLOWED_WITHDRAWAL_TRANSITIONS = {
  pending: ["approved", "rejected", "cancelled"],
  approved: ["completed", "rejected"],
  completed: [], // Terminal
  rejected: [],  // Terminal
  cancelled: []  // Terminal
};

export const generateWithdrawalReferenceId = () => {
  return "WD-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
};

const statusHistorySchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      enum: WITHDRAWAL_STATUSES,
      required: true
    },
    toStatus: {
      type: String,
      enum: WITHDRAWAL_STATUSES,
      required: true
    },
    reason: {
      type: String,
      required: [true, "A reason is required for status transitions"],
      trim: true,
      maxlength: [300, "Reason cannot exceed 300 characters"]
    },
    changedBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      role: { type: String, default: "SYSTEM" }
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const withdrawalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Withdrawal must belong to a user"],
      index: true
    },
    withdrawalId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    assetType: {
      type: String,
      enum: {
        values: SUPPORTED_ASSETS,
        message: "Unsupported withdrawal asset: {VALUE}"
      },
      default: "VE",
      required: [true, "Asset type is required"]
    },
    amount: {
      type: Number,
      required: [true, "Withdrawal amount is required"],
      min: [1, "Withdrawal amount must be at least 1 unit"],
      validate: {
        validator: Number.isInteger,
        message: "Withdrawal amount must be an integer"
      }
    },
    payoutMethod: {
      type: String,
      enum: ["UPI", "BANK_TRANSFER", "CRYPTO", "MANUAL"],
      default: "MANUAL"
    },
    payoutDetails: {
      accountIdentifier: {
        type: String,
        trim: true,
        default: null,
        maxlength: [100, "Account identifier cannot exceed 100 characters"]
      }
    },
    status: {
      type: String,
      enum: {
        values: WITHDRAWAL_STATUSES,
        message: "Invalid withdrawal status: {VALUE}"
      },
      default: "pending",
      index: true
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: []
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true
    },
    cancellationReason: {
      type: String,
      default: null,
      trim: true
    },
    adminNotes: {
      type: String,
      default: null,
      trim: true
    },
    holdTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null
    },
    releaseTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null
    },
    settleTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null
    },
    idempotencyKey: {
      type: String,
      required: [true, "idempotencyKey is required for withdrawal requests"],
      unique: true,
      index: true,
      trim: true
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    completedAt: {
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

withdrawalSchema.pre("validate", function () {
  if (!this.withdrawalId) {
    this.withdrawalId = generateWithdrawalReferenceId();
  }
});

withdrawalSchema.index({ userId: 1, status: 1, createdAt: -1 });

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);

export default Withdrawal;


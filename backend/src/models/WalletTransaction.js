import mongoose from "mongoose";
import { SUPPORTED_ASSETS } from "./Wallet.js";

export const TRANSACTION_TYPES = [
  "CREDIT",
  "DEBIT",
  "HOLD",
  "RELEASE",
  "SETTLE",
  "ADMIN_ADJUSTMENT"
];

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Transaction must belong to a user"],
      index: true
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: [true, "Transaction must reference a wallet"],
      index: true
    },
    assetType: {
      type: String,
      enum: {
        values: SUPPORTED_ASSETS,
        message: "Unsupported asset type: {VALUE}"
      },
      required: [true, "Asset type is required"]
    },
    type: {
      type: String,
      enum: {
        values: TRANSACTION_TYPES,
        message: "Invalid transaction type: {VALUE}"
      },
      required: [true, "Transaction type is required"]
    },
    amount: {
      type: Number,
      required: [true, "Transaction amount is required"],
      validate: {
        validator: (v) => Number.isInteger(v) && v !== 0,
        message: "Transaction amount must be a non-zero integer"
      }
    },
    balanceBefore: {
      type: Number,
      required: [true, "Balance before transaction is required"],
      validate: {
        validator: Number.isInteger,
        message: "Balance before must be an integer"
      }
    },
    balanceAfter: {
      type: Number,
      required: [true, "Balance after transaction is required"],
      validate: {
        validator: Number.isInteger,
        message: "Balance after must be an integer"
      }
    },
    reason: {
      type: String,
      required: [true, "Transaction reason is required"],
      trim: true,
      maxlength: [200, "Reason cannot exceed 200 characters"]
    },
    referenceType: {
      type: String,
      enum: [
        "PROVISIONING",
        "WITHDRAWAL",
        "REFERRAL",
        "ACHIEVEMENT",
        "EARNING",
        "ADMIN",
        "SYSTEM",
        "TEST"
      ],
      default: "SYSTEM"
    },
    referenceId: {
      type: String,
      default: null,
      trim: true
    },
    idempotencyKey: {
      type: String,
      required: [true, "Idempotency key is required to prevent duplicate operations"],
      unique: true,
      index: true,
      trim: true
    },
    actor: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      role: {
        type: String,
        enum: ["user", "admin", "system"],
        default: "system"
      },
      type: {
        type: String,
        enum: ["USER", "ADMIN", "SYSTEM"],
        default: "SYSTEM"
      }
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound index for fast chronological ledger lookup by user
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ walletId: 1, assetType: 1, createdAt: -1 });

// Strictly disallow updates and deletions on ledger records
const immutabilityError = () => {
  throw new Error("Wallet transactions are immutable and cannot be updated or deleted.");
};

walletTransactionSchema.pre("updateOne", immutabilityError);
walletTransactionSchema.pre("updateMany", immutabilityError);
walletTransactionSchema.pre("findOneAndUpdate", immutabilityError);
walletTransactionSchema.pre("findByIdAndUpdate", immutabilityError);
walletTransactionSchema.pre("deleteOne", immutabilityError);
walletTransactionSchema.pre("deleteMany", immutabilityError);
walletTransactionSchema.pre("findOneAndDelete", immutabilityError);
walletTransactionSchema.pre("findByIdAndDelete", immutabilityError);

const WalletTransaction = mongoose.model("WalletTransaction", walletTransactionSchema);

export default WalletTransaction;


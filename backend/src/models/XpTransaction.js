import mongoose from "mongoose";

const xpTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "XP transaction must belong to a user"],
      index: true
    },
    amount: {
      type: Number,
      required: [true, "XP transaction amount is required"],
      validate: {
        validator: (v) => Number.isInteger(v) && v > 0,
        message: "XP amount must be a positive integer"
      }
    },
    xpBefore: {
      type: Number,
      required: [true, "XP before transaction is required"],
      validate: {
        validator: Number.isInteger,
        message: "XP before must be an integer"
      }
    },
    xpAfter: {
      type: Number,
      required: [true, "XP after transaction is required"],
      validate: {
        validator: Number.isInteger,
        message: "XP after must be an integer"
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
      enum: ["TASK", "REWARD", "DAILY_BONUS", "ACHIEVEMENT", "ADMIN", "SYSTEM", "TEST"],
      default: "SYSTEM"
    },
    referenceId: {
      type: String,
      default: null,
      trim: true
    },
    idempotencyKey: {
      type: String,
      required: [true, "Idempotency key is required to prevent duplicate XP awards"],
      unique: true,
      index: true,
      trim: true
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

// Prevent mutating or deleting XP transaction records
const immutabilityError = () => {
  throw new Error("XP transaction ledger records are immutable and cannot be modified or deleted.");
};

xpTransactionSchema.pre("updateOne", immutabilityError);
xpTransactionSchema.pre("updateMany", immutabilityError);
xpTransactionSchema.pre("findOneAndUpdate", immutabilityError);
xpTransactionSchema.pre("findByIdAndUpdate", immutabilityError);
xpTransactionSchema.pre("deleteOne", immutabilityError);
xpTransactionSchema.pre("deleteMany", immutabilityError);
xpTransactionSchema.pre("findOneAndDelete", immutabilityError);
xpTransactionSchema.pre("findByIdAndDelete", immutabilityError);

const XpTransaction = mongoose.model("XpTransaction", xpTransactionSchema);

export default XpTransaction;

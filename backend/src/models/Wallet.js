import mongoose from "mongoose";

export const SUPPORTED_ASSETS = ["VE", "SVE", "GEM", "TOKEN"];

const assetBalanceSchema = new mongoose.Schema(
  {
    available: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Available balance cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Available balance must be an integer"
      }
    },
    reserved: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Reserved balance cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Reserved balance must be an integer"
      }
    },
    totalEarned: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Total earned balance cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Total earned balance must be an integer"
      }
    },
    totalWithdrawn: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Total withdrawn balance cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Total withdrawn balance must be an integer"
      }
    }
  },
  { _id: false }
);

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Wallet must be associated with a user"],
      unique: true,
      index: true
    },
    balances: {
      VE: {
        type: assetBalanceSchema,
        default: () => ({ available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 })
      },
      SVE: {
        type: assetBalanceSchema,
        default: () => ({ available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 })
      },
      GEM: {
        type: assetBalanceSchema,
        default: () => ({ available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 })
      },
      TOKEN: {
        type: assetBalanceSchema,
        default: () => ({ available: 0, reserved: 0, totalEarned: 0, totalWithdrawn: 0 })
      }
    },
    isLocked: {
      type: Boolean,
      default: false
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

walletSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    userId: this.userId,
    balances: this.balances,
    isLocked: this.isLocked,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const Wallet = mongoose.model("Wallet", walletSchema);

export default Wallet;


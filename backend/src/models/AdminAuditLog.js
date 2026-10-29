import mongoose from "mongoose";

export const AUDIT_ACTIONS = [
  "USER_STATUS_CHANGE",
  "USER_ROLE_CHANGE",
  "WITHDRAWAL_APPROVE",
  "WITHDRAWAL_REJECT",
  "WITHDRAWAL_SETTLE",
  "WALLET_ADJUSTMENT",
  "CONFIG_CHANGE"
];

export const AUDIT_TARGET_TYPES = ["USER", "WITHDRAWAL", "WALLET", "SYSTEM"];

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "adminId is required for audit logging"],
      index: true
    },
    adminEmail: {
      type: String,
      required: [true, "adminEmail is required"],
      trim: true,
      lowercase: true
    },
    adminRole: {
      type: String,
      required: [true, "adminRole is required"],
      default: "admin"
    },
    action: {
      type: String,
      required: [true, "Action is required"],
      enum: {
        values: AUDIT_ACTIONS,
        message: "Invalid audit action: {VALUE}"
      },
      index: true
    },
    targetType: {
      type: String,
      required: [true, "targetType is required"],
      enum: {
        values: AUDIT_TARGET_TYPES,
        message: "Invalid targetType: {VALUE}"
      },
      index: true
    },
    targetId: {
      type: String,
      required: [true, "targetId is required"],
      index: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    reason: {
      type: String,
      required: [true, "A reason is mandatory for administrative audit records"],
      trim: true
    },
    ipAddress: {
      type: String,
      default: null
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Compound indexes for high-frequency admin audit queries
adminAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });
adminAuditLogSchema.index({ adminId: 1, createdAt: -1 });

// Ensure strict immutability: Audit records must never be updated or deleted
const immutabilityError = () => {
  throw new Error("AdminAuditLog records are strictly immutable and cannot be updated or deleted.");
};

adminAuditLogSchema.pre("updateOne", immutabilityError);
adminAuditLogSchema.pre("updateMany", immutabilityError);
adminAuditLogSchema.pre("findOneAndUpdate", immutabilityError);
adminAuditLogSchema.pre("deleteOne", immutabilityError);
adminAuditLogSchema.pre("deleteMany", immutabilityError);
adminAuditLogSchema.pre("findOneAndDelete", immutabilityError);

const AdminAuditLog = mongoose.model("AdminAuditLog", adminAuditLogSchema);

export default AdminAuditLog;


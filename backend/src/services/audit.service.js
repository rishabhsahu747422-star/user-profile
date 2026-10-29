import AdminAuditLog, { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from "../models/AdminAuditLog.js";

/**
 * Creates an immutable audit log entry for an administrative action.
 */
export const logAdminAction = async ({
  adminUser,
  action,
  targetType,
  targetId,
  details = {},
  reason,
  ipAddress = null
}) => {
  if (!adminUser || !adminUser._id) {
    throw new Error("adminUser with valid _id is required for audit logging.");
  }
  if (!action || !AUDIT_ACTIONS.includes(action)) {
    throw new Error(`Invalid or missing audit action: ${action}. Allowed: ${AUDIT_ACTIONS.join(", ")}`);
  }
  if (!targetType || !AUDIT_TARGET_TYPES.includes(targetType)) {
    throw new Error(`Invalid or missing targetType: ${targetType}. Allowed: ${AUDIT_TARGET_TYPES.join(", ")}`);
  }
  if (!targetId) {
    throw new Error("targetId is required for audit logging.");
  }
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    throw new Error("A non-empty reason is mandatory for administrative audit records.");
  }

  const logEntry = new AdminAuditLog({
    adminId: adminUser._id,
    adminEmail: adminUser.email,
    adminRole: adminUser.role || "admin",
    action,
    targetType,
    targetId: String(targetId),
    details,
    reason: reason.trim(),
    ipAddress
  });

  await logEntry.save();
  return logEntry;
};

/**
 * Retrieves paginated audit logs with optional filters.
 */
export const getAuditLogs = async ({
  page = 1,
  limit = 20,
  action,
  targetType,
  targetId,
  adminId
} = {}) => {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (parsedPage - 1) * parsedLimit;

  const query = {};

  if (action && typeof action === "string" && AUDIT_ACTIONS.includes(action)) {
    query.action = action;
  }
  if (targetType && typeof targetType === "string" && AUDIT_TARGET_TYPES.includes(targetType)) {
    query.targetType = targetType;
  }
  if (targetId && typeof targetId === "string") {
    query.targetId = String(targetId).trim();
  }
  if (adminId && typeof adminId === "string" && adminId.trim()) {
    query.adminId = adminId.trim();
  }

  const [logs, total] = await Promise.all([
    AdminAuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate("adminId", "name email role")
      .lean(),
    AdminAuditLog.countDocuments(query)
  ]);

  return {
    logs,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1
    }
  };
};


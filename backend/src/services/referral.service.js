import User, { generateReferralCodeString } from "../models/User.js";
import Referral, {
  REFERRAL_STATUSES,
  ALLOWED_STATUS_TRANSITIONS
} from "../models/Referral.js";

/**
 * Validates a referral code and checks if the referrer account is active.
 */
export const validateReferralCode = async (code) => {
  if (!code || typeof code !== "string" || !code.trim()) {
    return { valid: false, message: "Referral code is required." };
  }

  const normalized = code.trim().toUpperCase();
  const referrer = await User.findOne({
    referralCode: normalized,
    status: "active"
  });

  if (!referrer) {
    return {
      valid: false,
      message: "Referral code is invalid, expired, or belongs to an inactive account."
    };
  }

  return {
    valid: true,
    referrerId: referrer._id,
    referrerName: referrer.name,
    referralCode: referrer.referralCode
  };
};

/**
 * Creates a referral relationship between a referrer and a new referred user.
 * Strictly prevents self-referrals and guarantees only ONE referral per referred user.
 */
export const createReferralRelationship = async ({
  referralCode,
  referredUserId,
  session = null
}) => {
  if (!referralCode || !referredUserId) {
    throw new Error("Both referralCode and referredUserId are required.");
  }

  const validation = await validateReferralCode(referralCode);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const referrerId = validation.referrerId;

  // Prevent self-referral
  if (referrerId.toString() === referredUserId.toString()) {
    throw new Error("Self-referral is strictly prohibited.");
  }

  // Check if referred user already has a referral relationship
  const existingReferral = await Referral.findOne({ referredUserId }).session(session);
  if (existingReferral) {
    throw new Error("This user already has an established referral relationship.");
  }

  try {
    const referral = new Referral({
      referrerId,
      referredUserId,
      referralCode: validation.referralCode,
      status: "pending",
      statusHistory: [
        {
          fromStatus: "pending",
          toStatus: "pending",
          reason: "Initial referral relationship established upon registration",
          changedAt: new Date(),
          changedBy: "REGISTRATION_FLOW"
        }
      ]
    });

    await referral.save({ session });
    return referral;
  } catch (error) {
    // If a concurrent request created a referral relationship for this referred user
    if (error.code === 11000) {
      throw new Error("This user already has an established referral relationship.");
    }
    throw error;
  }
};

/**
 * Retrieves referral metrics and summary for the authenticated user.
 */
export const getUserReferralSummary = async (userId) => {
  if (!userId) {
    throw new Error("userId is required.");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  // Ensure user has a referral code
  if (!user.referralCode) {
    user.referralCode = generateReferralCodeString();
    await user.save();
  }

  const [total, pending, qualified, rewarded, rejected] = await Promise.all([
    Referral.countDocuments({ referrerId: userId }),
    Referral.countDocuments({ referrerId: userId, status: "pending" }),
    Referral.countDocuments({ referrerId: userId, status: "qualified" }),
    Referral.countDocuments({ referrerId: userId, status: "rewarded" }),
    Referral.countDocuments({ referrerId: userId, status: "rejected" })
  ]);

  const successfulReferrals = qualified + rewarded;

  return {
    referralCode: user.referralCode,
    totalReferrals: total,
    successfulReferrals,
    pendingReferrals: pending,
    qualifiedReferrals: qualified,
    rewardedReferrals: rewarded,
    rejectedReferrals: rejected,
    referralRewardsEarned: 0, // Unapproved financial rewards are not fabricated
    referralXp: 0
  };
};

/**
 * Retrieves paginated referral history for the authenticated user.
 * Masks sensitive referred-user emails to protect privacy.
 */
export const getUserReferralsList = async (
  userId,
  { page = 1, limit = 10, status = null } = {}
) => {
  if (!userId) {
    throw new Error("userId is required.");
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  const query = { referrerId: userId };
  if (status && REFERRAL_STATUSES.includes(status)) {
    query.status = status;
  }

  const [referrals, total] = await Promise.all([
    Referral.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .populate("referredUserId", "name email createdAt")
      .lean(),
    Referral.countDocuments(query)
  ]);

  const sanitizedReferrals = referrals.map((ref) => {
    let maskedEmail = null;
    if (ref.referredUserId?.email) {
      const [local, domain] = ref.referredUserId.email.split("@");
      const visible = local.length > 2 ? local.slice(0, 2) : local[0];
      maskedEmail = `${visible}***@${domain}`;
    }

    return {
      id: ref._id,
      referredUser: {
        id: ref.referredUserId?._id || null,
        name: ref.referredUserId?.name || "Member",
        maskedEmail,
        joinedAt: ref.referredUserId?.createdAt || null
      },
      status: ref.status,
      qualifiedAt: ref.qualifiedAt,
      rewardedAt: ref.rewardedAt,
      rejectedAt: ref.rejectedAt,
      rejectionReason: ref.rejectionReason,
      createdAt: ref.createdAt
    };
  });

  return {
    referrals: sanitizedReferrals,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1
    }
  };
};

/**
 * Updates a referral's status enforcing state-machine integrity.
 */
export const updateReferralStatus = async ({
  referralId,
  newStatus,
  reason = "Status update",
  changedBy = "SYSTEM",
  session = null
}) => {
  if (!referralId || !newStatus) {
    throw new Error("referralId and newStatus are required.");
  }

  if (!REFERRAL_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${REFERRAL_STATUSES.join(", ")}`);
  }

  const referral = await Referral.findById(referralId).session(session);
  if (!referral) {
    throw new Error("Referral record not found.");
  }

  const currentStatus = referral.status;
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Illegal status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: [${allowed.join(", ")}]`
    );
  }

  referral.statusHistory.push({
    fromStatus: currentStatus,
    toStatus: newStatus,
    reason: reason.trim(),
    changedAt: new Date(),
    changedBy
  });

  referral.status = newStatus;

  if (newStatus === "qualified") {
    referral.qualifiedAt = new Date();
  } else if (newStatus === "rewarded") {
    referral.rewardedAt = new Date();
  } else if (newStatus === "rejected") {
    referral.rejectedAt = new Date();
    referral.rejectionReason = reason.trim();
  }

  await referral.save({ session });
  return referral;
};

/**
 * Idempotently backfills unique referral codes for any existing users missing one.
 */
export const backfillUserReferralCodes = async () => {
  const usersWithoutCode = await User.find({
    $or: [{ referralCode: { $exists: false } }, { referralCode: null }, { referralCode: "" }]
  });

  let backfilledCount = 0;
  for (const user of usersWithoutCode) {
    user.referralCode = generateReferralCodeString();
    await user.save();
    backfilledCount++;
  }

  return {
    totalInspected: usersWithoutCode.length,
    backfilledCount
  };
};


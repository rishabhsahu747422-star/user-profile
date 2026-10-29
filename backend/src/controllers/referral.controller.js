import {
  getUserReferralSummary,
  getUserReferralsList,
  validateReferralCode
} from "../services/referral.service.js";

/**
 * Get authenticated user's referral code and referral summary metrics.
 * Derived exclusively from req.user._id (JWT context).
 */
export const getMyReferralSummary = async (req, res) => {
  try {
    const summary = await getUserReferralSummary(req.user._id);
    res.status(200).json({
      referrals: summary
    });
  } catch (error) {
    console.error("Get referral summary error:", error.message);
    res.status(500).json({
      message: "Server error retrieving referral summary."
    });
  }
};

/**
 * Get paginated list of referrals for the authenticated user.
 */
export const getMyReferralHistory = async (req, res) => {
  try {
    const { page, limit, status } = req.query;
    const history = await getUserReferralsList(req.user._id, { page, limit, status });
    res.status(200).json(history);
  } catch (error) {
    console.error("Get referral history error:", error.message);
    res.status(500).json({
      message: "Server error retrieving referral history."
    });
  }
};

/**
 * Public endpoint to validate a referral code before submitting registration.
 */
export const validateCode = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await validateReferralCode(code);
    if (!result.valid) {
      return res.status(404).json(result);
    }
    res.status(200).json(result);
  } catch (error) {
    console.error("Validate referral code error:", error.message);
    res.status(500).json({
      message: "Server error validating referral code."
    });
  }
};


import rateLimit from "express-rate-limit";

/**
 * Rate limiter for authentication routes (login, register).
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 auth requests per 15m window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication requests from this IP. Please try again later."
  }
});

/**
 * Rate limiter for sensitive mutations (creating withdrawals, status updates).
 */
export const mutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many mutation requests. Please slow down and try again later."
  }
});

/**
 * General API rate limiter across endpoints.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Rate limit exceeded. Please try again later."
  }
});

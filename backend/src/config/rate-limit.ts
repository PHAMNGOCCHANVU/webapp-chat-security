import rateLimit from "express-rate-limit";
import { env } from "./env";

/**
 * Tập trung tất cả rate limit configurations tại đây.
 * Import và dùng tại routes hoặc app.ts.
 *
 * Khi NODE_ENV=test, giới hạn được nâng cao để không cản trở automated tests.
 */
const IS_TEST = env.NODE_ENV === "test";
const IS_DEMO = process.env.DEMO_MODE === "true";

// ── 1. Global rate limiter — bảo vệ toàn bộ API khỏi DDoS cơ bản ───────────
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_TEST || IS_DEMO ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
  skip: (req) => req.path === "/health",
});

// ── 2. Register: tối đa 3 lần / 1 giờ / IP ──────────────────────────────────
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: IS_TEST || IS_DEMO ? 1000 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts, please try again later." },
});

// ── 3. Login: tối đa 5 lần / 15 phút / IP ───────────────────────────────────
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_TEST || IS_DEMO ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many login attempts, please try again later." },
});

// ── 4. Change password: tối đa 3 lần / 1 giờ / IP ───────────────────────────
export const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: IS_TEST || IS_DEMO ? 1000 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password change attempts, please try again later." },
});

// ── 5. Admin API: tối đa 100 req / 15 phút / IP ─────────────────────────────
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_TEST || IS_DEMO ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests, please slow down." },
});

import rateLimit from "express-rate-limit";

/**
 * Tập trung tất cả rate limit configurations tại đây.
 * Import và dùng tại routes hoặc app.ts — không tạo limiter inline trong route files.
 */

// ── 1. Global rate limiter — bảo vệ toàn bộ API khỏi DDoS cơ bản ───────────
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 300,                  // Tối đa 300 request / 15 phút / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
  skip: (req) => req.path === "/health", // Không áp dụng cho health check
});

// ── 2. Register: tối đa 3 lần / 1 giờ / IP ──────────────────────────────────
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts, please try again later." },
});

// ── 3. Login: tối đa 5 lần / 15 phút / IP ───────────────────────────────────
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
});

// ── 4. Change password: tối đa 3 lần / 1 giờ / IP ───────────────────────────
export const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password change attempts, please try again later." },
});

// ── 5. Admin API: tối đa 100 req / 15 phút / IP ─────────────────────────────
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests, please slow down." },
});

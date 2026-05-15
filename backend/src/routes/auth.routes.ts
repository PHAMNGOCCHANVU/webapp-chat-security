import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import rateLimit from "express-rate-limit";

const router = Router();

/**
 * Rate limiting for auth endpoints
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // max 3 registrations per hour per IP
  message: "Too many registration attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 login attempts per 15 minutes per IP
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public routes (no authentication required)
 */

/**
 * POST /auth/register
 * Register a new user
 * Body: { email, username, password, displayName }
 */
router.post("/register", registerLimiter, AuthController.register);

/**
 * POST /auth/login
 * Login user and create session
 * Body: { username (email or username), password }
 */
router.post("/login", loginLimiter, AuthController.login);

/**
 * Protected routes (authentication required)
 */

/**
 * POST /auth/logout
 * Logout user and destroy session
 */
router.post("/logout", requireAuth, AuthController.logout);

/**
 * GET /auth/profile
 * Get current user profile
 */
router.get("/profile", requireAuth, AuthController.getProfile);

/**
 * PUT /auth/profile
 * Update user profile (displayName, avatarUrl)
 */
router.put("/profile", requireAuth, AuthController.updateProfile);

/**
 * POST /auth/change-password
 * Change user password
 * Body: { oldPassword, newPassword, confirmPassword }
 */
router.post("/change-password", requireAuth, AuthController.changePassword);

export default router;

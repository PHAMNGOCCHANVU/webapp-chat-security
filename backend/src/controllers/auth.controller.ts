import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { RegisterSchema, LoginSchema, UpdateProfileSchema, ChangePasswordSchema } from "../services/validators";
import { logAudit, AuditAction } from "../services/audit.service";
import { z } from "zod";

/**
 * Auth Controller - Handle authentication endpoints
 */
export class AuthController {
  /**
   * POST /auth/register
   * Register a new user
   */
  static async register(req: Request, res: Response) {
    try {
      const data = RegisterSchema.parse(req.body);
      const user = await AuthService.register(data);

      await logAudit({
        actorId: user.id,
        action: AuditAction.REGISTER,
        targetType: "users",
        targetId: user.id,
        description: `User registered: ${user.username}`,
        ipAddress: req.ip,
        status: "SUCCESS",
      });

      res.status(201).json({
        message: "Registration successful",
        user,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }

      await logAudit({
        action: AuditAction.REGISTER_FAILED,
        targetType: "users",
        description: `Registration failed: ${error.message}`,
        ipAddress: req.ip,
        status: "FAILED",
      });

      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /auth/login
   * Login user and create session
   */
  static async login(req: Request, res: Response) {
    try {
      const data = LoginSchema.parse(req.body);
      const user = await AuthService.login(data);

      // Set session
      (req.session as any).userId = user.id;
      (req.session as any).username = user.username;

      await logAudit({
        actorId: user.id,
        action: AuditAction.LOGIN,
        targetType: "users",
        targetId: user.id,
        description: `User logged in: ${user.username}`,
        ipAddress: req.ip,
        status: "SUCCESS",
      });

      res.status(200).json({
        message: "Login successful",
        user,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }

      await logAudit({
        action: AuditAction.LOGIN_FAILED,
        targetType: "users",
        description: `Login failed for input "${req.body?.username ?? "unknown"}": ${error.message}`,
        ipAddress: req.ip,
        status: "FAILED",
      });

      res.status(401).json({ error: error.message });
    }
  }

  /**
   * POST /auth/logout
   * Logout user and destroy session
   */
  static async logout(req: Request, res: Response) {
    const userId = (req.session as any).userId;
    const username = (req.session as any).username;

    try {
      if (userId) {
        await logAudit({
          actorId: userId,
          action: AuditAction.LOGOUT,
          targetType: "users",
          targetId: userId,
          description: `User logged out: ${username ?? userId}`,
          ipAddress: req.ip,
          status: "SUCCESS",
        });
      }

      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Could not logout" });
        }

        res.clearCookie("connect.sid");
        res.status(200).json({ message: "Logged out successfully" });
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /auth/profile
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req.session as any).userId;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const profile = await AuthService.getUserProfile(userId);
      res.status(200).json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * PUT /auth/profile
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req.session as any).userId;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = UpdateProfileSchema.parse(req.body);
      const user = await AuthService.updateProfile(userId, data);

      await logAudit({
        actorId: userId,
        action: AuditAction.UPDATE_PROFILE,
        targetType: "users",
        targetId: userId,
        description: "User updated profile",
        metadata: {
          updatedFields: Object.keys(data),
        },
        ipAddress: req.ip,
        status: "SUCCESS",
      });

      res.status(200).json({
        message: "Profile updated successfully",
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          avatarUrl: user.avatarUrl,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }

      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /auth/change-password
   * Change user password
   */
  static async changePassword(req: Request, res: Response) {
    const userId = (req.session as any).userId;

    try {
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = ChangePasswordSchema.parse(req.body);
      await AuthService.changePassword(userId, data);

      await logAudit({
        actorId: userId,
        action: AuditAction.CHANGE_PASSWORD,
        targetType: "users",
        targetId: userId,
        description: "User changed password successfully",
        ipAddress: req.ip,
        status: "SUCCESS",
      });

      res.status(200).json({ message: "Password changed successfully" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }

      await logAudit({
        actorId: userId,
        action: AuditAction.CHANGE_PASSWORD_FAILED,
        targetType: "users",
        targetId: userId,
        description: `Change password failed: ${error.message}`,
        ipAddress: req.ip,
        status: "FAILED",
      });

      res.status(400).json({ error: error.message });
    }
  }
}

import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { RegisterSchema, LoginSchema, UpdateProfileSchema, ChangePasswordSchema } from "../services/validators";
import { prisma } from "../config/prisma";
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

      // Log audit
      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          actionType: "REGISTER",
          targetTable: "users",
          targetId: user.id,
          actionStatus: "SUCCESS",
          ipAddress: req.ip,
          description: `User registered: ${user.username}`,
        },
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

      // Log failed attempt
      await prisma.auditLog.create({
        data: {
          actionType: "REGISTER",
          targetTable: "users",
          actionStatus: "FAILED",
          ipAddress: req.ip,
          description: `Registration failed: ${error.message}`,
        },
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

      // Log audit
      await prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          actionType: "LOGIN",
          targetTable: "users",
          targetId: user.id,
          actionStatus: "SUCCESS",
          ipAddress: req.ip,
          description: `User logged in: ${user.username}`,
        },
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

      // Log failed login attempt
      await prisma.auditLog.create({
        data: {
          actionType: "LOGIN",
          targetTable: "users",
          actionStatus: "FAILED",
          ipAddress: req.ip,
          description: `Login failed: ${error.message}`,
        },
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

    try {
      // Log audit before destroying session
      if (userId) {
        await prisma.auditLog.create({
          data: {
            actorUserId: userId,
            actionType: "LOGOUT",
            targetTable: "users",
            targetId: userId,
            actionStatus: "SUCCESS",
            ipAddress: req.ip,
            description: "User logged out",
          },
        });
      }

      // Destroy session
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

      // Log audit
      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          actionType: "UPDATE_PROFILE",
          targetTable: "users",
          targetId: userId,
          actionStatus: "SUCCESS",
          ipAddress: req.ip,
          description: "User updated profile",
        },
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
    try {
      const userId = (req.session as any).userId;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = ChangePasswordSchema.parse(req.body);
      await AuthService.changePassword(userId, data);

      // Log audit
      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          actionType: "CHANGE_PASSWORD",
          targetTable: "users",
          targetId: userId,
          actionStatus: "SUCCESS",
          ipAddress: req.ip,
          description: "User changed password",
        },
      });

      res.status(200).json({ message: "Password changed successfully" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }

      // Log failed attempt
      await prisma.auditLog.create({
        data: {
          actorUserId: (req.session as any).userId,
          actionType: "CHANGE_PASSWORD",
          targetTable: "users",
          targetId: (req.session as any).userId,
          actionStatus: "FAILED",
          ipAddress: req.ip,
          description: `Change password failed: ${error.message}`,
        },
      });

      res.status(400).json({ error: error.message });
    }
  }
}

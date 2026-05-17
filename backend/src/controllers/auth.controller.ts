import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { RegisterSchema, LoginSchema, UpdateProfileSchema, ChangePasswordSchema } from "../services/validators";
import { logAudit } from "../services/audit.service";
import { z } from "zod";
import jwt from "jsonwebtoken";

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
        action: "REGISTER",
        module: "AUTH",
        targetType: "USER",
        targetId: user.id,
        description: `User registered: ${user.username}`,
        request: req,
      });

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET || "default_jwt_secret",
        { expiresIn: "1d" }
      );

      // Set cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });

      res.status(201).json({
        message: "Registration successful",
        user,
        token,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }

      await logAudit({
        action: "REGISTER",
        module: "AUTH",
        targetType: "USER",
        description: `Registration failed: ${error.message}`,
        request: req,
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
      // 1. lấy input
      const data = LoginSchema.parse(req.body);
      
      // 2. lấy hashedPassword trong db để so với password input (done in AuthService.login)
      const user = await AuthService.login(data);

      // 3. nếu khớp, tạo accessToken với JWT
      const accessToken = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET || "default_jwt_secret",
        { expiresIn: "3m" }
      );

      // 4. tạo refresh token
      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET || "default_refresh_secret",
        { expiresIn: "7d" }
      );

      // 5. tạo session mới để lưu refresh token
      req.session.regenerate(async (err) => {
        if (err) {
          return res.status(500).json({ error: "Could not create session" });
        }

        (req.session as any).userId = user.id;
        (req.session as any).refreshToken = refreshToken;

        await logAudit({
          actorId: user.id,
          action: "LOGIN_SUCCESS",
          module: "AUTH",
          targetType: "USER",
          targetId: user.id,
          description: `User logged in: ${user.username}`,
          request: req,
        });

        // 6. trả refresh token về trong cookie
        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // 7. trả access token về trong res
        res.status(200).json({
          message: "Login successful",
          accessToken,
          user,
        });
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }

      await logAudit({
        action: "LOGIN_FAILED",
        module: "AUTH",
        targetType: "SESSION",
        description: `Login failed: ${error.message}`,
        request: req,
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

    try {
      // 1. lấy refresh token từ cookie
      req.cookies?.refreshToken;

      // Log audit before destroying session
      if (userId) {
        await logAudit({
          actorId: userId,
          action: "LOGOUT",
          module: "AUTH",
          targetType: "USER",
          targetId: userId,
          description: "User logged out",
          request: req,
        });
      }

      // 2. xoá refresh token trong Session (destroy session)
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Could not logout" });
        }

        // 3. xoá cookie
        res.clearCookie("refreshToken");
        res.clearCookie("token"); // just in case it was set from register
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
        action: "UPDATE_PROFILE",
        module: "AUTH",
        targetType: "USER",
        targetId: userId,
        description: "User updated profile",
        request: req,
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

      await logAudit({
        actorId: userId,
        action: "CHANGE_PASSWORD",
        module: "AUTH",
        targetType: "USER",
        targetId: userId,
        description: "User changed password",
        request: req,
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
        actorId: (req.session as any).userId,
        action: "CHANGE_PASSWORD",
        module: "AUTH",
        targetType: "USER",
        targetId: (req.session as any).userId,
        description: `Change password failed: ${error.message}`,
        request: req,
        status: "FAILED",
      });

      res.status(400).json({ error: error.message });
    }
  }
}

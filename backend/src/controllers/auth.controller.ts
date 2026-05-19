import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { logAudit, AuditAction } from "../services/audit.service";
import { AuthService } from "../services/auth.service";
import {
  RegisterSchema,
  LoginSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
} from "../services/validators";

const ACCESS_TOKEN_TTL = "24h";
const REFRESH_TOKEN_TTL = "24h";
const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieBaseOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
};

const createAccessToken = (user: { id: string; username: string }) =>
  jwt.sign({ userId: user.id, username: user.username }, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });

const createRefreshToken = (userId: string) =>
  jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const data = RegisterSchema.parse(req.body);
      const user = await AuthService.register(data);

      await logAudit({
        actorId: user.id,
        action: AuditAction.REGISTER,
        module: "AUTH",
        targetType: "USER",
        targetId: user.id,
        description: `User registered: ${user.username}`,
        request: req,
        status: "SUCCESS",
      });

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
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
        action: AuditAction.REGISTER_FAILED,
        module: "AUTH",
        targetType: "USER",
        description: `Registration failed: ${error.message}`,
        request: req,
        status: "FAILED",
      });

      res.status(400).json({ error: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const data = LoginSchema.parse(req.body);
      const user = await AuthService.login(data);
      const accessToken = createAccessToken(user);
      const refreshToken = createRefreshToken(user.id);

      req.session.regenerate(async (err) => {
        if (err) {
          return res.status(500).json({ error: "Could not create session" });
        }

        try {
          req.session.userId = user.id;
          req.session.username = user.username;
          req.session.refreshToken = refreshToken;

          await logAudit({
            actorId: user.id,
            action: AuditAction.LOGIN,
            module: "AUTH",
            targetType: "USER",
            targetId: user.id,
            description: `User logged in: ${user.username}`,
            request: req,
            status: "SUCCESS",
          });

          res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
            ...refreshCookieBaseOptions,
            maxAge: 24 * 60 * 60 * 1000,
          });

          req.session.save((saveErr) => {
            if (saveErr) {
              return res.status(500).json({ error: "Session save failed" });
            }

            res.status(200).json({
              message: "Login successful",
              accessToken,
              user,
            });
          });
        } catch (sessionError: any) {
          res.status(500).json({ error: sessionError.message ?? "Login failed" });
        }
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
        module: "AUTH",
        targetType: "SESSION",
        description: `Login failed for input "${req.body?.username ?? "unknown"}": ${error.message}`,
        request: req,
        status: "FAILED",
      });

      res.status(401).json({ error: error.message });
    }
  }

  static async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      return res.status(401).json({ error: "No refresh token provided" });
    }

    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };

      if (!req.session.userId || !req.session.refreshToken) {
        return res.status(401).json({ error: "Session not found" });
      }

      if (req.session.refreshToken !== refreshToken || req.session.userId !== decoded.userId) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      const user = await AuthService.getUserForSession(decoded.userId);

      if (!user) {
        return res.status(401).json({ error: "User no longer exists" });
      }

      if (["LOCKED", "DISABLED", "DELETED", "BANNED"].includes(user.status)) {
        return res.status(403).json({ error: "Account no longer has access" });
      }

      res.status(200).json({
        accessToken: createAccessToken(user),
      });
    } catch {
      return res.status(401).json({ error: "Refresh token expired or invalid" });
    }
  }

  static async logout(req: Request, res: Response) {
    const userId = req.session.userId;
    const username = req.session.username;

    try {
      if (userId) {
        await logAudit({
          actorId: userId,
          action: AuditAction.LOGOUT,
          module: "AUTH",
          targetType: "USER",
          targetId: userId,
          description: `User logged out: ${username ?? userId}`,
          request: req,
          status: "SUCCESS",
        });
      }

      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Could not logout" });
        }

        res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieBaseOptions);
        res.clearCookie("token");
        res.clearCookie("connect.sid");

        res.status(200).json({ message: "Logged out successfully" });
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const profile = await AuthService.getUserProfile(userId);
      res.status(200).json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = UpdateProfileSchema.parse(req.body);
      const user = await AuthService.updateProfile(userId, data);

      await logAudit({
        actorId: userId,
        action: AuditAction.UPDATE_PROFILE,
        module: "AUTH",
        targetType: "USER",
        targetId: userId,
        description: "User updated profile",
        request: req,
        metadata: {
          updatedFields: Object.keys(data),
        },
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

  static async changePassword(req: Request, res: Response) {
    const userId = req.session.userId;

    try {
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const data = ChangePasswordSchema.parse(req.body);
      await AuthService.changePassword(userId, data);

      await logAudit({
        actorId: userId,
        action: AuditAction.CHANGE_PASSWORD,
        module: "AUTH",
        targetType: "USER",
        targetId: userId,
        description: "User changed password successfully",
        request: req,
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
        module: "AUTH",
        targetType: "USER",
        targetId: userId,
        description: `Change password failed: ${error.message}`,
        request: req,
        status: "FAILED",
      });

      res.status(400).json({ error: error.message });
    }
  }
}

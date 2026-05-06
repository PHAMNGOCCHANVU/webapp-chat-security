import { Request, Response } from "express";
import { AuthService, registerSchema, loginSchema } from "../services/auth.service";
import { logAudit } from "../services/audit.service";
import { z } from "zod";

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const data = registerSchema.parse(req.body);
      const user = await AuthService.register(data);

      await logAudit({
        actorId: user.id,
        action: "REGISTER",
        targetType: "User",
        targetId: user.id,
        ipAddress: req.ip,
      });

      res.status(201).json(user);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }
      res.status(400).json({ error: err.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const data = loginSchema.parse(req.body);
      const user = await AuthService.login(data);

      req.session.userId = user.id;

      await logAudit({
        actorId: user.id,
        action: "LOGIN",
        ipAddress: req.ip,
      });

      res.status(200).json(user);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }
      res.status(401).json({ error: err.message });
    }
  }

  static async logout(req: Request, res: Response) {
    const userId = req.session.userId;

    req.session.destroy(async (err) => {
      if (err) {
        return res.status(500).json({ error: "Could not log out" });
      }

      if (userId) {
        await logAudit({
          actorId: userId,
          action: "LOGOUT",
          ipAddress: req.ip,
        });
      }

      res.clearCookie("connect.sid");
      res.status(200).json({ message: "Logged out successfully" });
    });
  }

  static async me(req: Request, res: Response) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { prisma } = await import("../config/prisma");
      const user = await prisma.user.findUnique({
        where: { id: req.session.userId },
        select: { id: true, username: true, displayName: true, email: true, role: true },
      });

      if (!user) return res.status(404).json({ error: "User not found" });

      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async searchUsers(req: Request, res: Response) {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") return res.json([]);

      const { prisma } = await import("../config/prisma");
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q } },
            { displayName: { contains: q } }
          ],
          id: { not: req.session.userId }
        },
        select: { id: true, username: true, displayName: true },
        take: 20
      });

      res.json(users);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

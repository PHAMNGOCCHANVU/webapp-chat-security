import { Request, Response } from "express";
import { AdminService } from "../services/admin.service";
import { logAudit } from "../services/audit.service";
import { prisma } from "../config/prisma";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "LOCKED"]),
});

const updateRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
});

export class AdminController {
  static async listUsers(req: Request, res: Response) {
    try {
      const users = await AdminService.listUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async updateUserStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = updateStatusSchema.parse(req.body);

      const user = await AdminService.updateUserStatus(id, status);

      await logAudit({
        actorId: req.session.userId!,
        action: "UPDATE_USER_STATUS",
        targetType: "User",
        targetId: id,
        description: `Changed status to ${status}`,
        ipAddress: req.ip,
      });

      res.json(user);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(400).json({ error: err.message });
    }
  }

  static async updateUserRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { role } = updateRoleSchema.parse(req.body);

      const user = await AdminService.updateUserRole(id, role);

      await logAudit({
        actorId: req.session.userId!,
        action: "UPDATE_USER_ROLE",
        targetType: "User",
        targetId: id,
        description: `Changed role to ${role}`,
        ipAddress: req.ip,
      });

      res.json(user);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(400).json({ error: err.message });
    }
  }

  static async getAuditLogs(req: Request, res: Response) {
    try {
      const { action, actor } = req.query;
      const filters: any = {};

      if (action && typeof action === "string") filters.action = action;
      if (actor && typeof actor === "string") filters.actor = actor;

      const logs = await AdminService.getAuditLogs(filters);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const currentUserId = req.session.userId;

      if (id === currentUserId) {
        return res.status(400).json({
          error: "Cannot delete your own account through admin panel",
        });
      }

      const user = await AdminService.deleteUser(id);

      await logAudit({
        actorId: currentUserId!,
        action: "DELETE_USER",
        targetType: "User",
        targetId: id,
        description: `Deleted user: ${user.username}`,
        ipAddress: req.ip,
      });

      res.json({ message: "User deleted successfully", user });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(400).json({ error: err.message });
    }
  }

  static async getSystemStats(req: Request, res: Response) {
    try {
      const totalUsers = await prisma.user.count();
      const activeUsers = await prisma.user.count({
        where: { status: "ACTIVE" },
      });
      const admins = await prisma.user.count({
        where: {
          userRoles: {
            some: {
              role: { roleName: "ADMIN" },
            },
          },
        },
      });

      res.json({
        totalUsers,
        activeUsers,
        admins,
        inactiveUsers: totalUsers - activeUsers,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

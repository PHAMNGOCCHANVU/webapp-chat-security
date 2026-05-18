import { Request, Response } from "express";
import { AdminService } from "../services/admin.service";
import { logAudit, AuditAction } from "../services/audit.service";
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
        action: AuditAction.UPDATE_USER_STATUS,
        targetType: "User",
        targetId: id,
        description: `Changed user status to ${status}`,
        metadata: { newStatus: status },
        ipAddress: req.ip,
        status: "SUCCESS",
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
        action: AuditAction.UPDATE_USER_ROLE,
        targetType: "User",
        targetId: id,
        description: `Changed user role to ${role}`,
        metadata: { newRole: role },
        ipAddress: req.ip,
        status: "SUCCESS",
      });

      res.json(user);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(400).json({ error: err.message });
    }
  }

  static async getAuditLogs(req: Request, res: Response) {
    try {
      // Schema validate query params
      const querySchema = z.object({
        action: z.string().optional(),
        actor: z.string().optional(),    // actorId
        targetType: z.string().optional(),
        status: z.enum(["SUCCESS", "FAILED"]).optional(),
        startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
        endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
        page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
        limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 50),
        search: z.string().optional(),
      });

      const parsed = querySchema.parse(req.query);

      const logs = await AdminService.getAuditLogs({
        action: parsed.action,
        actorId: parsed.actor,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        targetType: parsed.targetType,
        status: parsed.status,
        page: parsed.page,
        limit: parsed.limit,
        search: parsed.search,
      });

      res.json(logs);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
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
        action: AuditAction.DELETE_USER,
        targetType: "User",
        targetId: id,
        description: `Deleted user: ${user.username} (${user.email})`,
        metadata: { deletedUsername: user.username },
        ipAddress: req.ip,
        status: "SUCCESS",
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

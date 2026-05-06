import { Request, Response } from "express";
import { AdminService } from "../services/admin.service";
import { logAudit } from "../services/audit.service";
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
      const { action, actorId } = req.query;
      const filters: any = {};
      
      if (action && typeof action === "string") filters.action = action;
      if (actorId && typeof actorId === "string") filters.actorId = actorId;

      const logs = await AdminService.getAuditLogs(filters);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

import { Request, Response } from "express";
import { z } from "zod";
import { AdminService } from "../services/admin.service";
import { logAudit, AuditAction } from "../services/audit.service";

const userStatusSchema = z.enum(["ACTIVE", "LOCKED", "DISABLED", "DELETED"]);
const conversationStatusSchema = z.enum(["ACTIVE", "ARCHIVED", "DELETED"]);
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const roleNameSchema = z
  .string()
  .trim()
  .min(2, "Role name must be at least 2 characters")
  .max(50, "Role name must not exceed 50 characters")
  .regex(/^[A-Z0-9_]+$/, "Role name can only contain uppercase letters, numbers, and underscores");

const permissionNameSchema = z
  .string()
  .trim()
  .min(2, "Permission name must be at least 2 characters")
  .max(80, "Permission name must not exceed 80 characters")
  .regex(/^[A-Z0-9_]+$/, "Permission name can only contain uppercase letters, numbers, and underscores");

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must not exceed 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: passwordSchema,
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must not exceed 100 characters"),
  phone: z.string().max(20, "Phone number must not exceed 20 characters").optional().or(z.literal("")),
  bio: z.string().max(500, "Bio must not exceed 500 characters").optional().or(z.literal("")),
  status: userStatusSchema.exclude(["DELETED"]).optional(),
  roles: z.array(roleNameSchema).min(1).optional(),
});

const updateUserSchema = z
  .object({
    email: z.string().email("Invalid email address").optional(),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must not exceed 20 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
      .optional(),
    displayName: z
      .string()
      .min(1, "Display name is required")
      .max(100, "Display name must not exceed 100 characters")
      .optional(),
    phone: z.string().max(20, "Phone number must not exceed 20 characters").optional().or(z.literal("")),
    bio: z.string().max(500, "Bio must not exceed 500 characters").optional().or(z.literal("")),
    avatarUrl: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
    status: userStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const updateStatusSchema = z.object({
  status: userStatusSchema,
});

const rolePayloadSchema = z.object({
  role: roleNameSchema,
});

const createRoleSchema = z.object({
  roleName: roleNameSchema,
  description: z.string().max(255, "Description must not exceed 255 characters").optional().or(z.literal("")),
  permissionNames: z.array(permissionNameSchema).default([]),
});

const updateRoleSchema = z
  .object({
    roleName: roleNameSchema.optional(),
    description: z.string().max(255, "Description must not exceed 255 characters").optional().or(z.literal("")),
    permissionNames: z.array(permissionNameSchema).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const createConversationSchema = z.object({
  conversationName: z.string().trim().min(1, "Conversation name is required").max(100),
  memberIds: z.array(z.string().min(1, "Member ID is required")).min(1),
  ownerUserId: z.string().min(1).optional(),
});

const updateConversationSchema = z
  .object({
    conversationName: z.string().trim().min(1).max(100).optional(),
    status: conversationStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const memberPayloadSchema = z.object({
  memberIds: z.array(z.string().min(1, "Member ID is required")).min(1),
});

const conversationStatusPayloadSchema = z.object({
  status: conversationStatusSchema,
});

const isSelfTarget = (req: Request, targetUserId: string) => req.session.userId === targetUserId;
const getUserStatusAuditAction = (nextStatus: string, previousStatus?: string) => {
  if (nextStatus === "LOCKED") {
    return "LOCK_USER";
  }

  if (nextStatus === "ACTIVE" && previousStatus === "LOCKED") {
    return "UNLOCK_USER";
  }

  if (nextStatus === "DELETED") {
    return "DELETE_USER";
  }

  return "UPDATE_USER";
};

export class AdminController {
  static async listUsers(req: Request, res: Response) {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const users = await AdminService.listUsers({ search, status });
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getUser(req: Request, res: Response) {
    try {
      const user = await AdminService.getUserWithRoles(req.params.id);
      res.json(user);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const payload = createUserSchema.parse(req.body);
      const user = await AdminService.createUser(payload);

      await logAudit({
        actorId: req.session.userId!,
        action: "CREATE_USER",
        module: "USER",
        targetType: "USER",
        targetId: user.id,
        description: `Admin created user ${user.username}`,
        request: req,
      });

      res.status(201).json(user);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }

      res.status(400).json({ error: err.message });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payload = updateUserSchema.parse(req.body);

      if (isSelfTarget(req, id) && payload.status && payload.status !== "ACTIVE") {
        return res.status(400).json({
          error: "You cannot disable, lock, or delete your own admin account here",
        });
      }

      const user = await AdminService.updateUser(id, payload);

      await logAudit({
        actorId: req.session.userId!,
        action: "UPDATE_USER",
        module: "USER",
        targetType: "USER",
        targetId: id,
        description: `Admin updated user ${user.username}`,
        request: req,
      });

      res.json(user);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }

      res.status(400).json({ error: err.message });
    }
  }

  static async updateUserStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = updateStatusSchema.parse(req.body);

      if (isSelfTarget(req, id) && status !== "ACTIVE") {
        return res.status(400).json({
          error: "You cannot lock, disable, or delete your own admin account",
        });
      }

      const user = await AdminService.updateUserStatus(id, status);

      await logAudit({
        actorId: req.session.userId!,
        action: AuditAction.UPDATE_USER_STATUS,
        module: "USER",
        targetType: "USER",
        targetId: id,
        description: `Changed user status from ${user.previousStatus} to ${status}`,
        request: req,
        metadata: { previousStatus: user.previousStatus, newStatus: status },
        status: "SUCCESS",
      });

      res.json(user);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }

      res.status(400).json({ error: err.message });
    }
  }

  static async lockUser(req: Request, res: Response) {
    req.body = { ...req.body, status: "LOCKED" };
    return this.updateUserStatus(req, res);
  }

  static async unlockUser(req: Request, res: Response) {
    req.body = { ...req.body, status: "ACTIVE" };
    return this.updateUserStatus(req, res);
  }

  static async assignRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { role } = rolePayloadSchema.parse(req.body);
      const user = await AdminService.assignRole(id, role);

      await logAudit({
        actorId: req.session.userId!,
        action: AuditAction.UPDATE_USER_ROLE,
        module: "ROLE",
        targetType: "USER",
        targetId: id,
        description: `Assigned role ${role} to ${user.username}`,
        request: req,
        metadata: { newRole: role },
        status: "SUCCESS",
      });

      res.json(user);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }

      res.status(400).json({ error: err.message });
    }
  }

  static async revokeRole(req: Request, res: Response) {
    try {
      const { id, roleName } = req.params;
      const role = roleNameSchema.parse(roleName.toUpperCase());

      if (isSelfTarget(req, id) && role === "ADMIN") {
        return res.status(400).json({
          error: "You cannot revoke your own ADMIN role",
        });
      }

      const user = await AdminService.revokeRole(id, role);

      await logAudit({
        actorId: req.session.userId!,
        action: "REVOKE_ROLE",
        module: "ROLE",
        targetType: "USER",
        targetId: id,
        description: `Revoked role ${role} from ${user.username}`,
        request: req,
      });

      res.json(user);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }

      res.status(400).json({ error: err.message });
    }
  }

  static async listPermissions(req: Request, res: Response) {
    try {
      const permissions = await AdminService.listPermissions();
      res.json(permissions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async listRoles(req: Request, res: Response) {
    try {
      const roles = await AdminService.listRoles();
      res.json(roles);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createRole(req: Request, res: Response) {
    try {
      const payload = createRoleSchema.parse(req.body);
      const role = await AdminService.createRole(payload);

      await logAudit({
        actorId: req.session.userId!,
        action: "CREATE_ROLE",
        module: "ROLE",
        targetType: "ROLE",
        targetId: role.id,
        description: `Created role ${role.roleName}`,
        request: req,
      });

      res.status(201).json(role);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }

      res.status(400).json({ error: err.message });
    }
  }

  static async updateRole(req: Request, res: Response) {
    try {
      const payload = updateRoleSchema.parse(req.body);
      const role = await AdminService.updateRole(req.params.id, payload);

      await logAudit({
        actorId: req.session.userId!,
        action: "UPDATE_ROLE",
        module: "ROLE",
        targetType: "ROLE",
        targetId: role.id,
        description: `Updated role ${role.roleName}`,
        request: req,
      });

      res.json(role);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }

      res.status(400).json({ error: err.message });
    }
  }

  static async deleteRole(req: Request, res: Response) {
    try {
      const role = await AdminService.deleteRole(req.params.id);

      await logAudit({
        actorId: req.session.userId!,
        action: "DELETE_ROLE",
        module: "ROLE",
        targetType: "ROLE",
        targetId: role.id,
        description: `Deleted role ${role.roleName}`,
        request: req,
      });

      res.json({ message: "Role deleted successfully", role });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async listConversations(req: Request, res: Response) {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const type = typeof req.query.type === "string" ? req.query.type : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const conversations = await AdminService.listConversations({ search, type, status });
      res.json(conversations);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getConversation(req: Request, res: Response) {
    try {
      const conversation = await AdminService.getConversation(req.params.id);
      res.json(conversation);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }

  static async createConversation(req: Request, res: Response) {
    try {
      const payload = createConversationSchema.parse(req.body);
      const conversation = await AdminService.createConversation(req.session.userId!, payload);

      await logAudit({
        actorId: req.session.userId!,
        action: "CREATE_GROUP",
        module: "CONVERSATION",
        targetType: "GROUP",
        targetId: conversation.id,
        description: `Admin created group conversation ${conversation.displayName}`,
        request: req,
      });

      res.status(201).json(conversation);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }

      res.status(400).json({ error: err.message });
    }
  }

  static async updateConversation(req: Request, res: Response) {
    try {
      const payload = updateConversationSchema.parse(req.body);
      const conversation = await AdminService.updateConversation(req.params.id, payload);

      await logAudit({
        actorId: req.session.userId!,
        action: "UPDATE_GROUP",
        module: "CONVERSATION",
        targetType: "GROUP",
        targetId: conversation.id,
        description: `Admin updated conversation ${conversation.displayName}`,
        request: req,
      });

      res.json(conversation);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }

      res.status(400).json({ error: err.message });
    }
  }

  static async updateConversationStatus(req: Request, res: Response) {
    try {
      const { status } = conversationStatusPayloadSchema.parse(req.body);
      const conversation = await AdminService.updateConversationStatus(req.params.id, status);

      await logAudit({
        actorId: req.session.userId!,
        action: "UPDATE_GROUP",
        module: "CONVERSATION",
        targetType: "GROUP",
        targetId: conversation.id,
        description: `Admin changed conversation status to ${status}`,
        request: req,
      });

      res.json(conversation);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }

      res.status(400).json({ error: err.message });
    }
  }

  static async addConversationMembers(req: Request, res: Response) {
    try {
      const { memberIds } = memberPayloadSchema.parse(req.body);
      const conversation = await AdminService.addConversationMembers(req.params.id, memberIds);

      await logAudit({
        actorId: req.session.userId!,
        action: "ADD_MEMBER",
        module: "MEMBER",
        targetType: "GROUP",
        targetId: conversation.id,
        description: `Admin added ${memberIds.length} member(s) to ${conversation.displayName}`,
        request: req,
      });

      res.json(conversation);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: err.errors });
      }

      res.status(400).json({ error: err.message });
    }
  }

  static async removeConversationMember(req: Request, res: Response) {
    try {
      const conversation = await AdminService.removeConversationMember(
        req.params.id,
        req.params.userId
      );

      await logAudit({
        actorId: req.session.userId!,
        action: "REMOVE_MEMBER",
        module: "MEMBER",
        targetType: "GROUP",
        targetId: conversation.id,
        description: `Admin removed member ${req.params.userId} from ${conversation.displayName}`,
        request: req,
      });

      res.json(conversation);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getAuditLogs(req: Request, res: Response) {
    try {
      const querySchema = z.object({
        action: z.string().optional(),
        actor: z.string().optional(),
        actorId: z.string().optional(),
        module: z.string().optional(),
        targetType: z.string().optional(),
        status: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
        limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 50),
        search: z.string().optional(),
      });

      const parsed = querySchema.parse(req.query);

      const logs = await AdminService.getAuditLogs({
        action: parsed.action,
        actor: parsed.actor,
        actorId: parsed.actorId,
        module: parsed.module || parsed.targetType,
        status: parsed.status,
        dateFrom: parsed.dateFrom || parsed.from || parsed.startDate,
        dateTo: parsed.dateTo || parsed.to || parsed.endDate,
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

  static async getAuditLog(req: Request, res: Response) {
    try {
      const log = await AdminService.getAuditLog(req.params.id);
      res.json(log);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (isSelfTarget(req, id)) {
        return res.status(400).json({
          error: "Cannot delete your own account through admin panel",
        });
      }

      const user = await AdminService.deleteUser(id);

      await logAudit({
        actorId: req.session.userId!,
        action: AuditAction.DELETE_USER,
        module: "USER",
        targetType: "USER",
        targetId: id,
        description: `Deleted user: ${user.username} (${user.email})`,
        request: req,
        metadata: { deletedUsername: user.username },
        status: "SUCCESS",
      });

      res.json({ message: "User soft-deleted successfully", user });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getSystemStats(req: Request, res: Response) {
    try {
      const stats = await AdminService.getSystemStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

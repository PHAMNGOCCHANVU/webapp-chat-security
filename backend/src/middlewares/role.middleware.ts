import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { logAudit, AuditAction } from "../services/audit.service";

const normalizePermissionNames = (permissionNames: string | string[]) =>
  Array.isArray(permissionNames) ? permissionNames : [permissionNames];

/**
 * Middleware to require specific role
 * Ghi audit log khi bị từ chối vì không đủ quyền (403)
 * Usage: router.get("/admin", requireRole("ADMIN"), handler)
 */
export function requireRole(roleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = req.session as any;

      if (!session?.userId) {
        await logAudit({
          action: AuditAction.ACCESS_DENIED,
          module: "AUTH",
          targetType: "ADMIN",
          description: `Denied access to ${req.originalUrl}: missing session`,
          request: req,
          status: "FAILED",
        });

        return res.status(401).json({
          error: "Unauthorized",
          message: "Please log in first",
        });
      }

      const hasRole = await AuthService.hasRole(session.userId, roleName);

      if (!hasRole) {
        await logAudit({
          actorId: session.userId,
          action: AuditAction.ACCESS_DENIED,
          module: "ROLE",
          targetType: "ADMIN",
          description: `Denied access to ${req.originalUrl}: missing ${roleName} role`,
          request: req,
          status: "FAILED",
        });

        return res.status(403).json({
          error: "Forbidden",
          message: `This action requires ${roleName} role`,
        });
      }

      next();
    } catch (err: any) {
      console.error("Role middleware error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

/**
 * Middleware to require at least one permission.
 * Usage: router.get("/admin/users", requirePermission("USER_VIEW"), handler)
 */
export function requirePermission(permissionNames: string | string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = req.session as any;
      const normalizedPermissionNames = normalizePermissionNames(permissionNames)
        .map((permissionName) => permissionName.trim().toUpperCase())
        .filter(Boolean);

      if (!session?.userId) {
        await logAudit({
          action: AuditAction.ACCESS_DENIED,
          module: "AUTH",
          targetType: "ADMIN",
          description: `Denied access to ${req.originalUrl}: missing session`,
          request: req,
          status: "FAILED",
        });

        return res.status(401).json({
          error: "Unauthorized",
          message: "Please log in first",
        });
      }

      if (!normalizedPermissionNames.length) {
        return next();
      }

      for (const permissionName of normalizedPermissionNames) {
        const hasPermission = await AuthService.hasPermission(session.userId, permissionName);
        if (hasPermission) {
          return next();
        }
      }

      await logAudit({
        actorId: session.userId,
        action: AuditAction.ACCESS_DENIED,
        module: "ROLE",
        targetType: "ADMIN",
        description: `Denied access to ${req.originalUrl}: missing required permission (${normalizedPermissionNames.join(", ")})`,
        request: req,
        status: "FAILED",
      });

      return res.status(403).json({
        error: "Forbidden",
        message: `This action requires one of: ${normalizedPermissionNames.join(", ")}`,
      });
    } catch (err: any) {
      console.error("Permission middleware error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

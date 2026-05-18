import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { logAudit, AuditAction } from "../services/audit.service";

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
        return res.status(401).json({
          error: "Unauthorized",
          message: "Please log in first",
        });
      }

      const hasRole = await AuthService.hasRole(session.userId, roleName);

      if (!hasRole) {
        // Ghi log truy cập bị từ chối do không đủ role
        logAudit({
          actorId: session.userId,
          action: AuditAction.ACCESS_DENIED,
          description: `Forbidden: requires ${roleName} role for ${req.method} ${req.path}`,
          ipAddress: req.ip,
          status: "FAILED",
        }).catch(() => {});

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

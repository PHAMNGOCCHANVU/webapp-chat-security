import { Request, Response, NextFunction } from "express";
import { logAudit, AuditAction } from "../services/audit.service";

/**
 * Middleware to require authentication
 * Checks if user has valid session (userId in session)
 * Ghi audit log khi truy cập bị từ chối (401)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;

  if (!session || !session.userId) {
    // Ghi log truy cập không xác thực (không await để không block response)
    logAudit({
      action: AuditAction.ACCESS_DENIED,
      description: `Unauthorized: ${req.method} ${req.path} — no session`,
      ipAddress: req.ip,
      status: "FAILED",
    }).catch(() => {});

    return res.status(401).json({
      error: "Unauthorized",
      message: "Please log in to access this resource",
    });
  }

  next();
}

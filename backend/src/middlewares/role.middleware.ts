import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";

/**
 * Middleware to require specific role
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


import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";

export function requireRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.session.userId },
        select: { role: true },
      });

      if (!user || user.role !== role) {
        return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
      }

      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

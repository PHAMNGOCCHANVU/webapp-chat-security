import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { logAudit, AuditAction } from "../services/audit.service";
import { env } from "../config/env";

const normalizeStatus = (status: string) => (status === "BANNED" ? "DISABLED" : status);

/**
 * Require a valid JWT access token and an account that still has access.
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      await logAudit({
        actorId: (req.session as any)?.userId,
        action: AuditAction.ACCESS_DENIED,
        module: "AUTH",
        targetType: "SESSION",
        description: `Denied access to ${req.originalUrl}: missing access token`,
        request: req,
        status: "FAILED",
      });

      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication token was not provided",
      });
    }

    const secret = env.JWT_SECRET;
    const decoded = jwt.verify(token, secret) as { userId: string; username: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      await logAudit({
        actorId: decoded.userId,
        action: AuditAction.ACCESS_DENIED,
        module: "AUTH",
        targetType: "USER",
        targetId: decoded.userId,
        description: `Denied access to ${req.originalUrl}: user no longer exists`,
        request: req,
        status: "FAILED",
      });

      return res.status(401).json({
        error: "Unauthorized",
        message: "User no longer exists",
      });
    }

    if (["LOCKED", "DISABLED", "DELETED", "BANNED"].includes(user.status)) {
      await logAudit({
        actorId: user.id,
        action: AuditAction.ACCESS_DENIED,
        module: "AUTH",
        targetType: "USER",
        targetId: user.id,
        description: `Denied access to ${req.originalUrl}: account status is ${normalizeStatus(user.status)}`,
        request: req,
        status: "FAILED",
      });

      return res.status(403).json({
        error: "Forbidden",
        message: "Your account no longer has access",
      });
    }

    (req as any).user = {
      ...user,
      status: normalizeStatus(user.status),
    };

    if (req.session) {
      (req.session as any).userId = user.id;
    }

    next();
  } catch (error: any) {
    console.error("JWT verification failed in requireAuth:", error.message);

    if (error.name === "TokenExpiredError") {
      await logAudit({
        actorId: (req.session as any)?.userId,
        action: AuditAction.ACCESS_DENIED,
        module: "AUTH",
        targetType: "SESSION",
        description: `Denied access to ${req.originalUrl}: access token expired`,
        request: req,
        status: "FAILED",
      });

      return res.status(401).json({
        error: "TokenExpired",
        message: "Access token has expired",
      });
    }

    await logAudit({
      actorId: (req.session as any)?.userId,
      action: AuditAction.ACCESS_DENIED,
      module: "AUTH",
      targetType: "SESSION",
      description: `Denied access to ${req.originalUrl}: invalid access token`,
      request: req,
      status: "FAILED",
    });

    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid access token",
    });
  }
};

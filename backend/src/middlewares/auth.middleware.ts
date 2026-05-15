import { Request, Response, NextFunction } from "express";

/**
 * Middleware to require authentication
 * Checks if user has valid session (userId in session)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;

  if (!session || !session.userId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Please log in to access this resource",
    });
  }

  next();
}

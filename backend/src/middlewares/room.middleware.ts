import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";

/**
 * Middleware to verify user is a member of the conversation
 * Usage: router.get("/conversations/:conversationId/messages", requireRoomMember(), handler)
 */
export function requireRoomMember() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = req.session as any;
      const { conversationId } = req.params;

      if (!session?.userId) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Please log in first",
        });
      }

      // Check if user is member of conversation
      const member = await prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: session.userId,
          },
        },
      });

      if (!member) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You are not a member of this conversation",
        });
      }

      // Attach conversation member info to request
      (req as any).conversationMember = member;
      next();
    } catch (err: any) {
      res.status(500).json({
        error: "Server error",
        message: err.message,
      });
    }
  };
}

/**
 * Middleware to verify user is the creator/owner of the conversation
 * Usage: router.delete("/conversations/:conversationId", requireRoomOwner(), handler)
 */
export function requireRoomOwner() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = req.session as any;
      const { conversationId } = req.params;

      if (!session?.userId) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Please log in first",
        });
      }

      // Check if user is the creator of conversation
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation || conversation.createdBy !== session.userId) {
        return res.status(403).json({
          error: "Forbidden",
          message: "You must be the conversation creator to perform this action",
        });
      }

      (req as any).conversation = conversation;
      next();
    } catch (err: any) {
      res.status(500).json({
        error: "Server error",
        message: err.message,
      });
    }
  };
}

import { Request, Response, NextFunction } from "express";

import { prisma } from "../config/prisma";
import { FriendService } from "../services/friend.service";
import { userPreviewSelect } from "../utils/conversation.helper";

function resolveTargetUserId(req: Request) {
  return (
    req.body?.toUserId ??
    req.body?.recipientId ??
    req.params?.friendUserId ??
    req.params?.recipientId ??
    req.params?.userId ??
    null
  );
}

function resolveConversationId(req: Request) {
  return req.body?.conversationId ?? req.params?.conversationId ?? null;
}

function normalizeConversationType(rawType: unknown) {
  if (typeof rawType !== "string") {
    return null;
  }

  const upperType = rawType.toUpperCase();

  if (upperType === "DIRECT") {
    return "PRIVATE";
  }

  if (upperType === "PRIVATE" || upperType === "GROUP") {
    return upperType;
  }

  return null;
}

function normalizeParticipantIds(rawParticipants: unknown) {
  if (!Array.isArray(rawParticipants)) {
    return [];
  }

  return Array.from(
    new Set(
      rawParticipants
        .filter((value: unknown) => typeof value === "string")
        .map((value: string) => value.trim())
        .filter(Boolean)
    )
  );
}

export async function checkFriendship(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const currentUserId = req.session.userId;
    const targetUserId = resolveTargetUserId(req);

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!targetUserId) {
      return res.status(400).json({
        error: "Recipient user ID is required",
      });
    }

    if (currentUserId === targetUserId) {
      return res.status(400).json({
        error: "You cannot perform this action with yourself",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: userPreviewSelect,
    });

    if (!targetUser) {
      return res.status(404).json({
        error: "Target user not found",
      });
    }

    const friendship = await FriendService.findFriendship(currentUserId, targetUserId);

    if (!friendship) {
      return res.status(403).json({
        error: "You are not friends with this user",
      });
    }

    (req as any).friendUser = targetUser;
    (req as any).friendship = friendship;

    return next();
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to verify friendship",
    });
  }
}

export async function checkConversationFriendship(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const conversationType = normalizeConversationType(
      req.body?.type ?? req.body?.conversationType
    );

    const currentUserId = req.session.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const participantIds = normalizeParticipantIds(
      Array.isArray(req.body?.participantIds)
        ? req.body.participantIds
        : req.body?.participants
    );

    const otherParticipants = participantIds.filter(
      (participantId) => participantId !== currentUserId
    );

    (req as any).participantIds = otherParticipants;

    if (conversationType === "GROUP") {
      if (otherParticipants.length === 0) {
        return next();
      }

      const [participantUsers, friendships] = await Promise.all([
        prisma.user.findMany({
          where: {
            id: {
              in: otherParticipants,
            },
          },
          select: userPreviewSelect,
        }),
        prisma.friendship.findMany({
          where: {
            OR: [
              {
                user1Id: currentUserId,
                user2Id: {
                  in: otherParticipants,
                },
              },
              {
                user2Id: currentUserId,
                user1Id: {
                  in: otherParticipants,
                },
              },
            ],
          },
        }),
      ]);

      const participantUserMap = new Map(
        participantUsers.map((participant) => [participant.id, participant])
      );

      const missingUserIds = otherParticipants.filter(
        (participantId) => !participantUserMap.has(participantId)
      );

      if (missingUserIds.length > 0) {
        return res.status(404).json({
          error: "One or more group members were not found",
          missingUserIds,
        });
      }

      const friendIds = new Set<string>();
      for (const friendship of friendships) {
        friendIds.add(
          friendship.user1Id === currentUserId ? friendship.user2Id : friendship.user1Id
        );
      }

      const nonFriendUsers = otherParticipants
        .filter((participantId) => !friendIds.has(participantId))
        .map((participantId) => participantUserMap.get(participantId)!);

      if (nonFriendUsers.length > 0) {
        return res.status(403).json({
          error: "You can only add your friends to a group",
          nonFriendUsers,
        });
      }

      (req as any).participantUsers = participantUsers;
      return next();
    }

    if (otherParticipants.length !== 1) {
      return res.status(400).json({
        error: "Direct conversations must contain exactly two unique users",
      });
    }

    req.body.recipientId = otherParticipants[0];

    return checkFriendship(req, res, next);
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to verify conversation friendship",
    });
  }
}

export async function checkGroupMembership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const currentUserId = req.session.userId;
    const conversationId = resolveConversationId(req);

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!conversationId || typeof conversationId !== "string") {
      return res.status(400).json({
        error: "Conversation ID is required",
      });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: {
              select: userPreviewSelect,
            },
          },
        },
        lastMessage: {
          include: {
            sender: {
              select: userPreviewSelect,
            },
          },
        },
        creator: {
          select: userPreviewSelect,
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({
        error: "Conversation not found",
      });
    }

    if (conversation.conversationType !== "GROUP") {
      return res.status(400).json({
        error: "This API is only available for group conversations",
      });
    }

    const membership = conversation.members.find(
      (member) => member.userId === currentUserId
    );

    if (!membership) {
      return res.status(403).json({
        error: "You are not a member of this group",
      });
    }

    (req as any).groupConversation = conversation;
    (req as any).groupMembership = membership;
    (req as any).groupMembers = conversation.members;

    return next();
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || "Failed to verify group membership",
    });
  }
}

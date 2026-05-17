import { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../config/prisma";
import { logAudit } from "../services/audit.service";
import { ensureUserHasRole } from "../services/rbac-catalog.service";
import {
  conversationInclude,
  serializeConversation,
  userPreviewSelect,
} from "../utils/conversation.helper";
import { buildDirectMessageKey } from "../utils/message.helper";

const createConversationSchema = z
  .preprocess((rawInput) => {
    if (!rawInput || typeof rawInput !== "object") {
      return rawInput;
    }

    const body = rawInput as Record<string, unknown>;
    const rawType =
      typeof body.type === "string"
        ? body.type
        : typeof body.conversationType === "string"
          ? body.conversationType
          : "PRIVATE";

    const normalizedType = rawType.toUpperCase() === "DIRECT" ? "PRIVATE" : rawType.toUpperCase();
    const participantIds = Array.isArray(body.participantIds)
      ? body.participantIds
      : Array.isArray(body.participants)
        ? body.participants
        : [];

    return {
      conversationType: normalizedType,
      name: body.name,
      participantIds,
    };
  }, z.object({
    conversationType: z.enum(["PRIVATE", "GROUP"]),
    name: z.string().trim().max(100).optional(),
    participantIds: z.array(z.string().min(1, "Participant ID is required")).default([]),
  }))
  .superRefine((data, ctx) => {
    if (data.conversationType === "GROUP" && !data.name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "Group conversations must have a name",
      });
    }
  });

export class ConversationController {
  static async createConversation(req: Request, res: Response) {
    try {
      const currentUserId = req.session.userId!;
      const data = createConversationSchema.parse(req.body);

      const normalizedParticipantIds = Array.from(
        new Set(
          data.participantIds
            .map((participantId) => participantId.trim())
            .filter(Boolean)
        )
      );

      const allMemberIds = Array.from(new Set([currentUserId, ...normalizedParticipantIds]));

      if (data.conversationType === "PRIVATE") {
        const otherParticipantIds = allMemberIds.filter((memberId) => memberId !== currentUserId);

        if (otherParticipantIds.length !== 1 || allMemberIds.length !== 2) {
          return res.status(400).json({
            error: "Direct conversation must contain exactly two unique users",
          });
        }

        const directMessageKey = buildDirectMessageKey(currentUserId, otherParticipantIds[0]);

        const existingConversation = await prisma.conversation.findUnique({
          where: { directMessageKey },
          include: conversationInclude,
        });

        if (existingConversation) {
          return res.status(200).json({
            message: "Direct conversation already exists",
            conversation: serializeConversation(existingConversation, currentUserId),
          });
        }
      }

      if (data.conversationType === "GROUP" && allMemberIds.length < 3) {
        return res.status(400).json({
          error: "Group conversations must contain at least 3 unique members",
        });
      }

      const users = await prisma.user.findMany({
        where: {
          id: {
            in: allMemberIds,
          },
        },
        select: userPreviewSelect,
      });

      if (users.length !== allMemberIds.length) {
        const foundUserIds = new Set(users.map((user) => user.id));
        const missingUserIds = allMemberIds.filter((memberId) => !foundUserIds.has(memberId));

        return res.status(404).json({
          error: "One or more participants were not found",
          missingUserIds,
        });
      }

      const conversation = await prisma.$transaction(async (tx) => {
        const createdConversation = await tx.conversation.create({
          data: {
            conversationType: data.conversationType,
            conversationName: data.conversationType === "GROUP" ? data.name?.trim() || null : null,
            status: "ACTIVE",
            createdBy: currentUserId,
            directMessageKey:
              data.conversationType === "PRIVATE"
                ? buildDirectMessageKey(
                    currentUserId,
                    allMemberIds.find((memberId) => memberId !== currentUserId)!
                  )
                : null,
            members: {
              create: allMemberIds.map((memberId) => ({
                userId: memberId,
                memberRole:
                  data.conversationType === "GROUP" && memberId === currentUserId
                    ? "OWNER"
                    : "MEMBER",
                unreadCount: 0,
              })),
            },
          },
          include: conversationInclude,
        });

        if (data.conversationType === "GROUP") {
          await ensureUserHasRole(tx, currentUserId, "OWNER");
        }

        return createdConversation;
      });

      await logAudit({
        actorId: currentUserId,
        action:
          data.conversationType === "GROUP" ? "CREATE_GROUP" : "CREATE_CONVERSATION",
        module: "CONVERSATION",
        targetType: data.conversationType === "GROUP" ? "GROUP" : "CONVERSATION",
        targetId: conversation.id,
        description:
          data.conversationType === "GROUP"
            ? `Created group conversation ${conversation.conversationName || conversation.id}`
            : `Created direct conversation ${conversation.id}`,
        request: req,
      });

      return res.status(201).json(serializeConversation(conversation, currentUserId));
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }

      if (err.code === "P2002") {
        return res.status(409).json({ error: "Conversation already exists" });
      }

      return res.status(500).json({ error: err.message });
    }
  }

  static async getConversations(req: Request, res: Response) {
    try {
      const currentUserId = req.session.userId!;

      const conversations = await prisma.conversation.findMany({
        where: {
          status: {
            not: "DELETED",
          },
          members: {
            some: {
              userId: currentUserId,
            },
          },
        },
        include: conversationInclude,
        orderBy: [
          {
            lastMessageAt: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
      });

      return res.status(200).json({
        conversations: conversations.map((conversation) =>
          serializeConversation(conversation, currentUserId)
        ),
      });
    } catch (err: any) {
      return res.status(500).json({
        error: err.message || "Failed to load conversations",
      });
    }
  }
}

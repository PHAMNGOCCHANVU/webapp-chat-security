import { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../config/prisma";
import { logAudit } from "../services/audit.service";
import {
  conversationInclude,
  serializeConversation,
} from "../utils/conversation.helper";
import {
  buildDirectMessageKey,
  messageInclude,
  serializeMessage,
  updateConversationAfterCreateMessage,
} from "../utils/message.helper";
import { encryptMessage } from "../utils/crypto";

const baseMessageSchema = z.object({
  content: z.string().trim().optional(),
  imageUrl: z.string().trim().url("Image URL must be a valid URL").optional(),
});

const sendDirectMessageSchema = baseMessageSchema.extend({
  toUserId: z.string().min(1, "Recipient user ID is required"),
});

const sendGroupMessageSchema = baseMessageSchema.extend({
  conversationId: z.string().min(1, "Conversation ID is required"),
});

const getMessagesSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().min(1).optional(),
});

async function ensureConversationMember(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: conversationInclude,
  });

  if (!conversation) {
    return { error: "Conversation not found", status: 404 as const };
  }

  if (conversation.status === "DELETED") {
    return { error: "Conversation has been deleted", status: 410 as const };
  }

  const isMember = conversation.members.some((member) => member.userId === userId);

  if (!isMember) {
    return { error: "You are not a member of this conversation", status: 403 as const };
  }

  return { conversation };
}

export class MessageController {
  static async sendDirectMessage(req: Request, res: Response) {
    try {
      const senderId = req.session.userId!;
      const { toUserId, content, imageUrl } = sendDirectMessageSchema.parse(req.body);
      const trimmedContent = content?.trim() || "";
      const trimmedImageUrl = imageUrl?.trim() || "";
      const friendUser = (req as any).friendUser;

      if (!trimmedContent && !trimmedImageUrl) {
        return res.status(400).json({ error: "Message cannot be empty" });
      }

      if (senderId === toUserId) {
        return res.status(400).json({ error: "You cannot send a direct message to yourself" });
      }

      const directMessageKey = buildDirectMessageKey(senderId, toUserId);

      const result = await prisma.$transaction(async (tx) => {
        const conversation = await tx.conversation.upsert({
          where: {
            directMessageKey,
          },
          update: {
            status: "ACTIVE",
          },
          create: {
            conversationType: "PRIVATE",
            status: "ACTIVE",
            createdBy: senderId,
            directMessageKey,
            members: {
              create: [
                {
                  userId: senderId,
                  memberRole: "MEMBER",
                  unreadCount: 0,
                },
                {
                  userId: toUserId,
                  memberRole: "MEMBER",
                  unreadCount: 0,
                },
              ],
            },
          },
        });

        const createdMessageRecord = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId,
            encryptedContent: encryptMessage(trimmedContent),
            imageUrl: trimmedImageUrl || null,
          },
        });

        const createdMessage = await tx.message.findUniqueOrThrow({
          where: { id: createdMessageRecord.id },
          include: messageInclude,
        });

        await updateConversationAfterCreateMessage(tx, {
          conversationId: conversation.id,
          messageId: createdMessage.id,
          senderId,
          createdAt: createdMessage.createdAt,
        });

        const updatedConversation = await tx.conversation.findUnique({
          where: { id: conversation.id },
          include: conversationInclude,
        });

        return {
          conversation: updatedConversation!,
          message: createdMessage,
        };
      });

      await logAudit({
        actorId: senderId,
        action: "SEND_DIRECT_MESSAGE",
        targetType: "Message",
        targetId: result.message.id,
        description: `Sent direct message to ${friendUser?.username || toUserId}`,
        ipAddress: req.ip,
      });

      return res.status(201).json({
        conversation: serializeConversation(result.conversation, senderId),
        message: serializeMessage(result.message, senderId),
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }

      return res.status(500).json({ error: err.message });
    }
  }

  static async sendGroupMessage(req: Request, res: Response) {
    try {
      const senderId = req.session.userId!;
      const { conversationId, content, imageUrl } = sendGroupMessageSchema.parse(req.body);
      const trimmedContent = content?.trim() || "";
      const trimmedImageUrl = imageUrl?.trim() || "";

      if (!trimmedContent && !trimmedImageUrl) {
        return res.status(400).json({ error: "Message cannot be empty" });
      }

      const accessResult = await ensureConversationMember(conversationId, senderId);
      if ("error" in accessResult) {
        return res.status(accessResult.status ?? 500).json({ error: accessResult.error });
      }

      if (accessResult.conversation.status !== "ACTIVE") {
        return res.status(403).json({ error: "This conversation is not accepting new messages" });
      }

      const result = await prisma.$transaction(async (tx) => {
        const createdMessageRecord = await tx.message.create({
          data: {
            conversationId,
            senderId,
            encryptedContent: encryptMessage(trimmedContent),
            imageUrl: trimmedImageUrl || null,
          },
        });

        const createdMessage = await tx.message.findUniqueOrThrow({
          where: { id: createdMessageRecord.id },
          include: messageInclude,
        });

        await updateConversationAfterCreateMessage(tx, {
          conversationId,
          messageId: createdMessage.id,
          senderId,
          createdAt: createdMessage.createdAt,
        });

        const updatedConversation = await tx.conversation.findUnique({
          where: { id: conversationId },
          include: conversationInclude,
        });

        return {
          conversation: updatedConversation!,
          message: createdMessage,
        };
      });

      await logAudit({
        actorId: senderId,
        action: "SEND_GROUP_MESSAGE",
        targetType: "Message",
        targetId: result.message.id,
        description: `Sent group message in conversation ${conversationId}`,
        ipAddress: req.ip,
      });

      return res.status(201).json({
        conversation: serializeConversation(result.conversation, senderId),
        message: serializeMessage(result.message, senderId),
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }

      return res.status(500).json({ error: err.message });
    }
  }

  static async getMessages(req: Request, res: Response) {
    try {
      const currentUserId = req.session.userId!;
      const parsedData = getMessagesSchema.parse({
        conversationId: req.params.conversationId,
        limit: req.query.limit,
        cursor: req.query.cursor,
      });

      const accessResult = await ensureConversationMember(
        parsedData.conversationId,
        currentUserId
      );

      if ("error" in accessResult) {
        return res.status(accessResult.status ?? 500).json({ error: accessResult.error });
      }

      if (parsedData.cursor) {
        const cursorMessage = await prisma.message.findFirst({
          where: {
            id: parsedData.cursor,
            conversationId: parsedData.conversationId,
            isDeleted: false,
          },
        });

        if (!cursorMessage) {
          return res.status(404).json({
            error: "Cursor message not found in this conversation",
          });
        }
      }

      const rawMessages = await prisma.message.findMany({
        where: {
          conversationId: parsedData.conversationId,
          isDeleted: false,
        },
        include: messageInclude,
        orderBy: [
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],
        take: parsedData.limit + 1,
        ...(parsedData.cursor
          ? {
              cursor: {
                id: parsedData.cursor,
              },
              skip: 1,
            }
          : {}),
      });

      const hasMore = rawMessages.length > parsedData.limit;
      const pageMessages = hasMore
        ? rawMessages.slice(0, parsedData.limit)
        : rawMessages;
      const nextCursor =
        hasMore && pageMessages.length > 0
          ? pageMessages[pageMessages.length - 1].id
          : null;

      return res.status(200).json({
        conversation: serializeConversation(accessResult.conversation, currentUserId),
        messages: pageMessages
          .reverse()
          .map((message) => serializeMessage(message, currentUserId)),
        pagination: {
          limit: parsedData.limit,
          cursor: parsedData.cursor || null,
          nextCursor,
          hasMore,
        },
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }

      return res.status(500).json({ error: err.message || "Failed to load messages" });
    }
  }
}

import { Prisma, PrismaClient } from "@prisma/client";

import { userPreviewSelect } from "./conversation.helper";

type PrismaExecutor = Prisma.TransactionClient | PrismaClient;

export const messageInclude = {
  sender: {
    select: userPreviewSelect,
  },
} satisfies Prisma.MessageInclude;

export type MessagePayload = Prisma.MessageGetPayload<{
  include: typeof messageInclude;
}>;

export function buildDirectMessageKey(userAId: string, userBId: string) {
  return userAId < userBId ? `${userAId}:${userBId}` : `${userBId}:${userAId}`;
}

export function serializeMessage(message: MessagePayload, currentUserId?: string) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    messageContent: message.messageContent,
    imageUrl: message.imageUrl,
    isDeleted: message.isDeleted,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    sender: message.sender,
    isMine: currentUserId ? message.senderId === currentUserId : undefined,
  };
}

export async function updateConversationAfterCreateMessage(
  prismaDb: PrismaExecutor,
  params: {
    conversationId: string;
    messageId: string;
    senderId: string;
    createdAt: Date;
  }
) {
  const { conversationId, messageId, senderId, createdAt } = params;

  await prismaDb.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageId: messageId,
      lastMessageAt: createdAt,
    },
  });

  await prismaDb.conversationMember.updateMany({
    where: {
      conversationId,
      userId: senderId,
    },
    data: {
      lastReadAt: createdAt,
      unreadCount: 0,
    },
  });

  await prismaDb.conversationMember.updateMany({
    where: {
      conversationId,
      NOT: {
        userId: senderId,
      },
    },
    data: {
      unreadCount: {
        increment: 1,
      },
    },
  });
}

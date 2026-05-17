import { Prisma } from "@prisma/client";

export const userPreviewSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

export const conversationInclude = {
  creator: {
    select: userPreviewSelect,
  },
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
} satisfies Prisma.ConversationInclude;

export type ConversationPayload = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

export function serializeConversation(
  conversation: ConversationPayload,
  currentUserId?: string
) {
  const currentMembership = currentUserId
    ? conversation.members.find((member) => member.userId === currentUserId)
    : null;

  const otherParticipant = currentUserId
    ? conversation.members.find((member) => member.userId !== currentUserId)?.user ?? null
    : null;

  const title =
    conversation.conversationType === "GROUP"
      ? conversation.conversationName || "Untitled group"
      : otherParticipant?.displayName || otherParticipant?.username || "Direct conversation";

  const seenBy =
    conversation.lastMessageAt == null
      ? []
      : conversation.members
          .filter(
            (member) =>
              member.lastReadAt != null &&
              member.lastReadAt.getTime() >= conversation.lastMessageAt!.getTime()
          )
          .map((member) => ({
            seenAt: member.lastReadAt,
            user: member.user,
          }));

  return {
    id: conversation.id,
    type: conversation.conversationType,
    isGroup: conversation.conversationType === "GROUP",
    name: title,
    conversationName: conversation.conversationName,
    status: conversation.status,
    directMessageKey: conversation.directMessageKey,
    createdBy: conversation.createdBy,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    lastMessageAt: conversation.lastMessageAt,
    avatarUrl:
      conversation.conversationType === "GROUP" ? null : otherParticipant?.avatarUrl || null,
    creator: conversation.creator,
    memberCount: conversation.members.length,
    unreadCount: currentMembership?.unreadCount ?? 0,
    lastReadAt: currentMembership?.lastReadAt ?? null,
    myMembership: currentMembership
      ? {
          memberRole: currentMembership.memberRole,
          joinedAt: currentMembership.joinedAt,
          unreadCount: currentMembership.unreadCount,
          lastReadAt: currentMembership.lastReadAt,
        }
      : null,
    otherParticipant,
    participants: conversation.members.map((member) => ({
      id: member.user.id,
      username: member.user.username,
      displayName: member.user.displayName,
      avatarUrl: member.user.avatarUrl,
      memberRole: member.memberRole,
      joinedAt: member.joinedAt,
      lastReadAt: member.lastReadAt,
      unreadCount: member.unreadCount,
    })),
    seenBy,
    lastMessage: conversation.lastMessage
      ? {
          id: conversation.lastMessage.id,
          conversationId: conversation.lastMessage.conversationId,
          senderId: conversation.lastMessage.senderId,
          messageContent: conversation.lastMessage.messageContent,
          imageUrl: conversation.lastMessage.imageUrl,
          isDeleted: conversation.lastMessage.isDeleted,
          createdAt: conversation.lastMessage.createdAt,
          updatedAt: conversation.lastMessage.updatedAt,
          sender: conversation.lastMessage.sender,
        }
      : null,
  };
}

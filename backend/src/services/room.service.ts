import { prisma } from "../config/prisma";
import { ensureUserHasRole } from "./rbac-catalog.service";
import { z } from "zod";

export const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  isPrivate: z.boolean().default(false),
});

export const addMemberSchema = z.object({
  userId: z.string(),
});

export class RoomService {
  static async listRooms(userId: string) {
    // Only return conversations where user is an actual member
    return prisma.conversation.findMany({
      where: {
        status: { not: "DELETED" },
        members: { some: { userId } }
      },
      include: {
        creator: { select: { id: true, username: true, displayName: true } },
        _count: { select: { members: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 } // Last message
      },
      orderBy: { updatedAt: "desc" }
    });
  }

  static async createRoom(userId: string, data: z.infer<typeof createRoomSchema>) {
    const conversationType = data.isPrivate ? "PRIVATE" : "GROUP";
    
    return prisma.$transaction(async (tx) => {
      const room = await tx.conversation.create({
        data: {
          conversationType,
          conversationName: data.name,
          status: "ACTIVE",
          createdBy: userId,
          members: {
            create: {
              userId: userId,
              joinedAt: new Date(),
              memberRole: conversationType === "GROUP" ? "OWNER" : "MEMBER",
            }
          }
        },
        include: {
          creator: { select: { id: true, username: true, displayName: true } },
          members: {
            include: {
              user: { select: { id: true, username: true, displayName: true } }
            }
          }
        }
      });

      if (conversationType === "GROUP") {
        await ensureUserHasRole(tx, userId, "OWNER");
      }

      return room;
    });
  }

  static async getRoomDetails(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        creator: { select: { id: true, username: true, displayName: true } },
        members: {
          include: { user: { select: { id: true, username: true, displayName: true } } }
        }
      }
    });

    if (!conversation) throw new Error("Room not found");
    if (conversation.status === "DELETED") throw new Error("Room not found");

    // Check access: user must be a member or it's a GROUP conversation
    if (conversation.conversationType === "PRIVATE") {
      const isMember = conversation.members.some(m => m.userId === userId);
      if (!isMember) throw new Error("Forbidden: Not a member of this private conversation");
    }

    return conversation;
  }

  static async getMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    // Check membership first
    await this.getRoomDetails(conversationId, userId);

    return prisma.message.findMany({
      where: {
        conversationId,
        isDeleted: false,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        sender: { select: { id: true, username: true, displayName: true } }
      }
    });
  }

  static async addMember(conversationId: string, adderId: string, data: z.infer<typeof addMemberSchema>) {
    // Check if adder is conversation creator
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) throw new Error("Conversation not found");
    if (conversation.status === "DELETED") throw new Error("Conversation has been deleted");
    if (conversation.createdBy !== adderId) {
      throw new Error("Forbidden: Only conversation creator can add members");
    }

    // Check if user exists
    const userToAdd = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!userToAdd) throw new Error("User to add not found");

    // Check if already a member
    const existingMember = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: data.userId
        }
      }
    });

    if (existingMember) throw new Error("User is already a member of this conversation");

    return prisma.conversationMember.create({
      data: {
        conversationId,
        userId: data.userId,
        joinedAt: new Date()
      },
      include: {
        user: { select: { id: true, username: true, displayName: true } }
      }
    });
  }

  static async removeMember(conversationId: string, removerId: string, targetUserId: string) {
    // Check if remover is conversation creator
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) throw new Error("Conversation not found");
    if (conversation.status === "DELETED") throw new Error("Conversation has been deleted");

    const isCreator = conversation.createdBy === removerId;
    const removingSelf = removerId === targetUserId;

    if (!isCreator && !removingSelf) {
      throw new Error("Forbidden: You can only remove yourself or must be conversation creator");
    }

    return prisma.conversationMember.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId
        }
      }
    });
  }
}

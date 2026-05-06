import { prisma } from "../config/prisma";
import { z } from "zod";

export const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  isPrivate: z.boolean().default(false),
});

export const addMemberSchema = z.object({
  userId: z.string(),
  isOwner: z.boolean().default(false),
});

export class RoomService {
  static async listRooms(userId: string) {
    // Return all public rooms + private rooms where user is a member
    return prisma.room.findMany({
      where: {
        OR: [
          { isPrivate: false },
          { members: { some: { userId } } }
        ]
      },
      include: {
        _count: { select: { members: true } }
      }
    });
  }

  static async createRoom(userId: string, data: z.infer<typeof createRoomSchema>) {
    return prisma.room.create({
      data: {
        name: data.name,
        isPrivate: data.isPrivate,
        members: {
          create: {
            userId: userId,
            isOwner: true,
          }
        }
      }
    });
  }

  static async getRoomDetails(roomId: string, userId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, displayName: true } } }
        }
      }
    });

    if (!room) throw new Error("Room not found");

    if (room.isPrivate) {
      const isMember = room.members.some(m => m.userId === userId);
      if (!isMember) throw new Error("Forbidden: Not a member of this private room");
    }

    return room;
  }

  static async getMessages(roomId: string, userId: string) {
    // Check membership first
    await this.getRoomDetails(roomId, userId);

    return prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, username: true, displayName: true } }
      }
    });
  }

  static async addMember(roomId: string, adderId: string, data: z.infer<typeof addMemberSchema>) {
    // Check if adder is owner
    const adderMember = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: adderId } }
    });

    if (!adderMember?.isOwner) {
      throw new Error("Forbidden: Only room owners can add members");
    }

    // Check if user exists
    const userToAdd = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!userToAdd) throw new Error("User to add not found");

    return prisma.roomMember.create({
      data: {
        roomId,
        userId: data.userId,
        isOwner: data.isOwner
      }
    });
  }

  static async removeMember(roomId: string, removerId: string, targetUserId: string) {
    const removerMember = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: removerId } }
    });

    if (!removerMember?.isOwner && removerId !== targetUserId) {
      throw new Error("Forbidden: Only room owners can remove other members");
    }

    return prisma.roomMember.delete({
      where: { roomId_userId: { roomId, userId: targetUserId } }
    });
  }
}

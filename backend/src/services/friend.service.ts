import { prisma } from "../config/prisma";

type NormalizedFriendPair = {
  user1Id: string;
  user2Id: string;
};

export class FriendService {
  /**
   * Prisma không có schema.pre như Mongoose.
   * Vì vậy mình chuẩn hóa thứ tự ID ngay trong service:
   * ID nhỏ hơn luôn đứng trước để tránh lưu trùng A-B và B-A.
   */
  static normalizeFriendPair(userAId: string, userBId: string): NormalizedFriendPair {
    if (userAId === userBId) {
      throw new Error("A user cannot be friends with themselves");
    }

    return userAId < userBId
      ? { user1Id: userAId, user2Id: userBId }
      : { user1Id: userBId, user2Id: userAId };
  }

  static async createFriendship(userAId: string, userBId: string) {
    const { user1Id, user2Id } = this.normalizeFriendPair(userAId, userBId);

    return prisma.friendship.create({
      data: {
        user1Id,
        user2Id,
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  static async findFriendship(userAId: string, userBId: string) {
    const { user1Id, user2Id } = this.normalizeFriendPair(userAId, userBId);

    return prisma.friendship.findFirst({
      where: {
        user1Id,
        user2Id,
      },
    });
  }

  static async listFriends(userId: string) {
    return prisma.friendship.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}

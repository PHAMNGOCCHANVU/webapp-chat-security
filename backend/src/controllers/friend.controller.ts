import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../config/prisma";
import { logAudit } from "../services/audit.service";
import { FriendService } from "../services/friend.service";

const userPreviewSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const sendFriendRequestSchema = z.object({
  toUserId: z.string().min(1, "Recipient user ID is required"),
  message: z.string().trim().max(500, "Message must not exceed 500 characters").optional(),
});

const requestParamSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
});

const friendParamSchema = z.object({
  friendUserId: z.string().min(1, "Friend user ID is required"),
});

const searchQuerySchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
});

export class FriendController {
  static async searchByUsername(req: Request, res: Response) {
    try {
      const currentUserId = req.session.userId!;
      const { username } = searchQuerySchema.parse(req.query);
      const normalizedUsername = username.replace(/^@+/, "");

      const user = await prisma.user.findFirst({
        where: {
          username: normalizedUsername,
        },
        select: userPreviewSelect,
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.id === currentUserId) {
        return res.status(400).json({ error: "You cannot add yourself as a friend" });
      }

      return res.status(200).json({ user });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }

      return res.status(500).json({ error: err.message });
    }
  }

  static async sendFriendRequest(req: Request, res: Response) {
    try {
      const currentUserId = req.session.userId!;
      const { toUserId, message } = sendFriendRequestSchema.parse(req.body);

      if (currentUserId === toUserId) {
        return res.status(400).json({ error: "You cannot send a friend request to yourself" });
      }

      const [fromUser, toUser] = await Promise.all([
        prisma.user.findUnique({
          where: { id: currentUserId },
          select: userPreviewSelect,
        }),
        prisma.user.findUnique({
          where: { id: toUserId },
          select: userPreviewSelect,
        }),
      ]);

      if (!fromUser) {
        return res.status(404).json({ error: "Sender user not found" });
      }

      if (!toUser) {
        return res.status(404).json({ error: "Recipient user not found" });
      }

      const existingFriendship = await FriendService.findFriendship(currentUserId, toUserId);
      if (existingFriendship) {
        return res.status(409).json({ error: "These users are already friends" });
      }

      const existingRequest = await prisma.friendRequest.findFirst({
        where: {
          OR: [
            {
              senderId: currentUserId,
              receiverId: toUserId,
            },
            {
              senderId: toUserId,
              receiverId: currentUserId,
            },
          ],
        },
        include: {
          sender: {
            select: userPreviewSelect,
          },
          receiver: {
            select: userPreviewSelect,
          },
        },
      });

      if (existingRequest) {
        return res.status(409).json({
          error:
            existingRequest.senderId === currentUserId
              ? "Friend request already sent"
              : "This user has already sent you a friend request",
          request: existingRequest,
        });
      }

      const friendRequest = await prisma.friendRequest.create({
        data: {
          senderId: currentUserId,
          receiverId: toUserId,
          message: message?.trim() || null,
        },
        include: {
          sender: {
            select: userPreviewSelect,
          },
          receiver: {
            select: userPreviewSelect,
          },
        },
      });

      await logAudit({
        actorId: currentUserId,
        action: "SEND_FRIEND_REQUEST",
        targetType: "FriendRequest",
        targetId: friendRequest.id,
        description: `Sent friend request to ${toUser.username}`,
        ipAddress: req.ip,
      });

      return res.status(201).json(friendRequest);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }

      return res.status(500).json({ error: err.message });
    }
  }

  static async acceptFriendRequest(req: Request, res: Response) {
    try {
      const currentUserId = req.session.userId!;
      const { requestId } = requestParamSchema.parse(req.params);

      const existingRequest = await prisma.friendRequest.findUnique({
        where: { id: requestId },
        include: {
          sender: {
            select: userPreviewSelect,
          },
          receiver: {
            select: userPreviewSelect,
          },
        },
      });

      if (!existingRequest) {
        return res.status(404).json({ error: "Friend request not found" });
      }

      if (existingRequest.receiverId !== currentUserId) {
        return res.status(403).json({ error: "Only the receiver can accept this friend request" });
      }

      const alreadyFriends = await FriendService.findFriendship(
        existingRequest.senderId,
        existingRequest.receiverId
      );

      if (alreadyFriends) {
        await prisma.friendRequest.delete({ where: { id: requestId } });

        return res.status(200).json({
          message: "Users are already friends. Stale friend request removed.",
          friendship: alreadyFriends,
        });
      }

      const friendship = await prisma.$transaction(async (tx) => {
        const { user1Id, user2Id } = FriendService.normalizeFriendPair(
          existingRequest.senderId,
          existingRequest.receiverId
        );

        const createdFriendship = await tx.friendship.create({
          data: {
            user1Id,
            user2Id,
          },
          include: {
            user1: {
              select: userPreviewSelect,
            },
            user2: {
              select: userPreviewSelect,
            },
          },
        });

        await tx.friendRequest.delete({
          where: { id: requestId },
        });

        return createdFriendship;
      });

      await logAudit({
        actorId: currentUserId,
        action: "ACCEPT_FRIEND_REQUEST",
        targetType: "Friendship",
        targetId: friendship.id,
        description: `Accepted friend request from ${existingRequest.sender.username}`,
        ipAddress: req.ip,
      });

      return res.status(201).json(friendship);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }

      if (err.code === "P2002") {
        return res.status(409).json({ error: "Friendship already exists" });
      }

      return res.status(500).json({ error: err.message });
    }
  }

  static async declineFriendRequest(req: Request, res: Response) {
    try {
      const currentUserId = req.session.userId!;
      const { requestId } = requestParamSchema.parse(req.params);

      const existingRequest = await prisma.friendRequest.findUnique({
        where: { id: requestId },
        include: {
          sender: {
            select: userPreviewSelect,
          },
          receiver: {
            select: userPreviewSelect,
          },
        },
      });

      if (!existingRequest) {
        return res.status(404).json({ error: "Friend request not found" });
      }

      if (existingRequest.receiverId !== currentUserId) {
        return res.status(403).json({ error: "Only the receiver can decline this friend request" });
      }

      await prisma.friendRequest.delete({
        where: { id: requestId },
      });

      await logAudit({
        actorId: currentUserId,
        action: "DECLINE_FRIEND_REQUEST",
        targetType: "FriendRequest",
        targetId: requestId,
        description: `Declined friend request from ${existingRequest.sender.username}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ message: "Friend request declined successfully" });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }

      return res.status(500).json({ error: err.message });
    }
  }

  static async getAllFriends(req: Request, res: Response) {
    try {
      const currentUserId = req.session.userId!;
      const friendships = await FriendService.listFriends(currentUserId);

      const friends = friendships.map((friendship) => {
        const friend =
          friendship.user1Id === currentUserId ? friendship.user2 : friendship.user1;

        return {
          friendshipId: friendship.id,
          createdAt: friendship.createdAt,
          updatedAt: friendship.updatedAt,
          user: friend,
        };
      });

      return res.status(200).json(friends);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getFriendRequests(req: Request, res: Response) {
    try {
      const currentUserId = req.session.userId!;

      const [sentRequests, receivedRequests] = await Promise.all([
        prisma.friendRequest.findMany({
          where: {
            senderId: currentUserId,
            status: "PENDING",
          },
          include: {
            sender: {
              select: userPreviewSelect,
            },
            receiver: {
              select: userPreviewSelect,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.friendRequest.findMany({
          where: {
            receiverId: currentUserId,
            status: "PENDING",
          },
          include: {
            sender: {
              select: userPreviewSelect,
            },
            receiver: {
              select: userPreviewSelect,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
      ]);

      return res.status(200).json({
        sentRequests,
        receivedRequests,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async deleteFriend(req: Request, res: Response) {
    try {
      const currentUserId = req.session.userId!;
      const { friendUserId } = friendParamSchema.parse(req.params);

      if (currentUserId === friendUserId) {
        return res.status(400).json({ error: "You cannot unfriend yourself" });
      }

      const friendship = await FriendService.findFriendship(currentUserId, friendUserId);

      if (!friendship) {
        return res.status(404).json({ error: "Friendship not found" });
      }

      await prisma.friendship.delete({
        where: { id: friendship.id },
      });

      await logAudit({
        actorId: currentUserId,
        action: "DELETE_FRIEND",
        targetType: "Friendship",
        targetId: friendship.id,
        description: `Removed friendship between ${currentUserId} and ${friendUserId}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({ message: "Friend removed successfully" });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }

      return res.status(500).json({ error: err.message });
    }
  }
}

import { Server, Socket } from "socket.io";
import { prisma } from "../config/prisma";
import { logAudit } from "../services/audit.service";

interface UserSession {
  userId: string;
  username: string;
}

interface RoomData {
  conversationId: string;
  users: Map<string, UserSession>;
}

// Track active rooms and users
const activeRooms = new Map<string, RoomData>();

export async function setupSocketHandlers(io: Server) {
  // Middleware to authenticate socket connection
  io.use(async (socket, next) => {
    try {
      const session = (socket.request as any).session;
      
      if (!session?.userId) {
        return next(new Error("Authentication failed - no session"));
      }
      
      // Verify session exists in database
      const dbSession = await prisma.session.findUnique({
        where: { sid: session.id },
      });

      if (!dbSession) {
        return next(new Error("Session not found in database"));
      }

      // Attach user info to socket
      (socket as any).userId = session.userId;
      (socket as any).username = session.username || "Unknown";
      
      next();
    } catch (err: any) {
      next(new Error(`Authentication error: ${err.message}`));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId = (socket as any).userId;
    const username = (socket as any).username;

    console.log(`✅ Socket connected: ${socket.id} (user: ${username} | id: ${userId})`);

    // Track connection
    await logAudit({
      actorId: userId,
      action: "SOCKET_CONNECT",
      targetType: "Socket",
      targetId: socket.id,
      description: `User connected to chat`,
      status: "SUCCESS"
    });

    /**
     * Event: join-room
     * User joins a conversation room
     */
    socket.on("join-room", async (data: { conversationId: string }, callback?) => {
      try {
        const { conversationId } = data;

        // Verify user is member of conversation
        const member = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId
            }
          }
        });

        if (!member) {
          socket.emit("error", { 
            message: "Not a member of this conversation",
            code: "FORBIDDEN" 
          });
          return;
        }

        const conversationState = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { status: true },
        });

        if (!conversationState || conversationState.status === "DELETED") {
          socket.emit("error", {
            message: "Conversation is no longer available",
            code: "GONE"
          });
          return;
        }

        // Join socket.io room
        socket.join(conversationId);
        console.log(`👤 User ${username} joined conversation ${conversationId}`);

        // Track in active rooms
        if (!activeRooms.has(conversationId)) {
          activeRooms.set(conversationId, {
            conversationId,
            users: new Map()
          });
        }

        const roomData = activeRooms.get(conversationId)!;
        roomData.users.set(userId, { userId, username });

        // Notify others in room
        socket.to(conversationId).emit("user-joined", {
          userId,
          username,
          timestamp: new Date(),
          usersOnline: Array.from(roomData.users.values())
        });

        // Send room info to joining user
        const roomInfo = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            members: {
              include: {
                user: { select: { id: true, username: true, displayName: true } }
              }
            },
            messages: {
              take: 20,
              orderBy: { createdAt: "desc" },
              include: {
                sender: { select: { id: true, username: true, displayName: true } }
              }
            }
          }
        });

        if (callback) {
          callback({
            success: true,
            room: roomInfo,
            usersOnline: Array.from(roomData.users.values())
          });
        }
      } catch (err: any) {
        console.error("Error joining room:", err);
        socket.emit("error", { 
          message: "Failed to join room",
          code: "ERROR",
          details: err.message
        });
      }
    });

    /**
     * Event: leave-room
     * User leaves a conversation room
     */
    socket.on("leave-room", async (data: { conversationId: string }) => {
      try {
        const { conversationId } = data;

        socket.leave(conversationId);
        console.log(`👋 User ${username} left conversation ${conversationId}`);

        // Update active rooms
        const roomData = activeRooms.get(conversationId);
        if (roomData) {
          roomData.users.delete(userId);
          if (roomData.users.size === 0) {
            activeRooms.delete(conversationId);
          }
        }

        // Notify others
        socket.to(conversationId).emit("user-left", {
          userId,
          username,
          timestamp: new Date(),
          usersOnline: roomData ? Array.from(roomData.users.values()) : []
        });

        await logAudit({
          actorId: userId,
          action: "LEAVE_ROOM",
          targetType: "Conversation",
          targetId: conversationId,
          description: `User left conversation`,
          status: "SUCCESS"
        });
      } catch (err: any) {
        console.error("Error leaving room:", err);
      }
    });

    /**
     * Event: send-message
     * Send message to room
     */
    socket.on(
      "send-message",
      async (
        data: { conversationId: string; content?: string; imageUrl?: string },
        callback?
      ) => {
      try {
        const { conversationId, content, imageUrl } = data;
        const trimmedContent = content?.trim() || "";
        const trimmedImageUrl = imageUrl?.trim() || "";

        if (!trimmedContent && !trimmedImageUrl) {
          socket.emit("error", { 
            message: "Message must contain text or an image",
            code: "INVALID_INPUT"
          });
          return;
        }

        // Verify user is member
        const member = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId
            }
          }
        });

        if (!member) {
          socket.emit("error", { 
            message: "Not a member of this conversation",
            code: "FORBIDDEN"
          });
          return;
        }

        const conversationState = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { status: true },
        });

        if (!conversationState || conversationState.status === "DELETED") {
          socket.emit("error", {
            message: "Conversation is no longer available",
            code: "GONE"
          });
          return;
        }

        if (conversationState.status !== "ACTIVE") {
          socket.emit("error", {
            message: "This conversation is not accepting new messages",
            code: "FORBIDDEN"
          });
          return;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            conversationId,
            messageContent: trimmedContent || null,
            imageUrl: trimmedImageUrl || null,
            senderId: userId,
          },
          include: {
            sender: { select: { id: true, username: true, displayName: true } }
          }
        });

        console.log(`💬 Message sent in ${conversationId} by ${username}`);

        // Audit log
        await logAudit({
          actorId: userId,
          action: "SEND_MESSAGE",
          targetType: "Message",
          targetId: message.id,
          description: `Sent message in conversation ${conversationId}`,
          status: "SUCCESS"
        });

        // Broadcast message to room
        io.to(conversationId).emit("new-message", {
          id: message.id,
          conversationId,
          content: message.messageContent,
          imageUrl: message.imageUrl,
          sender: message.sender,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt
        });

        if (callback) {
          callback({ success: true, messageId: message.id });
        }
      } catch (err: any) {
        console.error("Failed to send message:", err);
        socket.emit("error", { 
          message: "Failed to send message",
          code: "ERROR",
          details: err.message
        });
      }
    });

    /**
     * Event: typing
     * Broadcast typing indicator
     */
    socket.on("typing", async (data: { conversationId: string; isTyping: boolean }) => {
      try {
        const { conversationId, isTyping } = data;

        // Broadcast typing status to others in room
        socket.to(conversationId).emit("user-typing", {
          userId,
          username,
          isTyping,
          timestamp: new Date()
        });
      } catch (err: any) {
        console.error("Error broadcasting typing:", err);
      }
    });

    /**
     * Event: get-message-history
     * Fetch message history with pagination
     */
    socket.on("get-message-history", async (data: { conversationId: string; limit?: number; offset?: number }, callback?) => {
      try {
        const { conversationId, limit = 50, offset = 0 } = data;

        // Verify membership
        const member = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId
            }
          }
        });

        if (!member) {
          socket.emit("error", { 
            message: "Not a member of this conversation",
            code: "FORBIDDEN"
          });
          return;
        }

        const conversationState = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { status: true },
        });

        if (!conversationState || conversationState.status === "DELETED") {
          socket.emit("error", {
            message: "Conversation is no longer available",
            code: "GONE"
          });
          return;
        }

        const messages = await prisma.message.findMany({
          where: { conversationId, isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          include: {
            sender: { select: { id: true, username: true, displayName: true } }
          }
        });

        if (callback) {
          callback({
            success: true,
            messages: messages.reverse(),
            count: messages.length
          });
        }
      } catch (err: any) {
        console.error("Error fetching message history:", err);
        socket.emit("error", { 
          message: "Failed to fetch message history",
          code: "ERROR"
        });
      }
    });

    /**
     * Event: get-active-users
     * Get list of currently active users in a room
     */
    socket.on("get-active-users", async (data: { conversationId: string }, callback?) => {
      try {
        const { conversationId } = data;
        const roomData = activeRooms.get(conversationId);
        const users = roomData ? Array.from(roomData.users.values()) : [];

        if (callback) {
          callback({ users });
        }
      } catch (err: any) {
        console.error("Error getting active users:", err);
      }
    });

    /**
     * Event: disconnect
     * Handle user disconnection
     */
    socket.on("disconnect", async () => {
      console.log(`❌ Socket disconnected: ${socket.id} (user: ${username})`);

      // Remove user from all active rooms
      activeRooms.forEach((roomData, conversationId) => {
        if (roomData.users.has(userId)) {
          roomData.users.delete(userId);
          
          // Notify others
          socket.to(conversationId).emit("user-left", {
            userId,
            username,
            timestamp: new Date(),
            usersOnline: Array.from(roomData.users.values())
          });

          // Clean up empty rooms
          if (roomData.users.size === 0) {
            activeRooms.delete(conversationId);
          }
        }
      });

      // Audit log
      await logAudit({
        actorId: userId,
        action: "SOCKET_DISCONNECT",
        targetType: "Socket",
        targetId: socket.id,
        description: `User disconnected from chat`,
        status: "SUCCESS"
      });
    });

    /**
     * Handle errors
     */
    socket.on("error", (error: any) => {
      console.error(`Socket error from ${username}:`, error);
    });
  });
}

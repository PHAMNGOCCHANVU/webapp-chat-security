import { Server, Socket } from "socket.io";
import { prisma } from "../config/prisma";
import { parse } from "cookie";

// Very basic parsing to get session id from socket headers
// Note: In production you should properly parse the express-session cookie
// and validate the session against the store.

export function setupSocketHandlers(io: Server) {
  io.use((socket, next) => {
    // Basic auth check for sockets
    const cookies = parse(socket.request.headers.cookie || "");
    const sid = cookies["connect.sid"];
    
    if (!sid) {
      return next(new Error("Authentication error"));
    }
    
    // For simplicity we trust the presence of a sid. 
    // Real implementation should decode sid and fetch from session store.
    next();
  });

  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join-room", async (data: { roomId: string; userId: string }) => {
      try {
        // Verify membership
        const member = await prisma.roomMember.findUnique({
          where: { roomId_userId: { roomId: data.roomId, userId: data.userId } }
        });

        if (!member) {
          socket.emit("error", { message: "Not a member of this room" });
          return;
        }

        socket.join(data.roomId);
        console.log(`User ${data.userId} joined room ${data.roomId}`);
      } catch (err) {
        console.error(err);
      }
    });

    socket.on("send-message", async (data: { roomId: string; content: string; senderId: string }) => {
      try {
        // Save to database
        const message = await prisma.message.create({
          data: {
            roomId: data.roomId,
            content: data.content,
            senderId: data.senderId,
          },
          include: {
            sender: { select: { id: true, username: true, displayName: true } }
          }
        });

        // Broadcast to room
        io.to(data.roomId).emit("new-message", message);
      } catch (err) {
        console.error("Failed to send message:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

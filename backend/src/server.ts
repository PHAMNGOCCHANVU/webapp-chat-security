import http from "http";
import { Server } from "socket.io";
import app from "./app";

const PORT = Number(process.env.PORT ?? 4000);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// TODO: Tach socket event handler sang src/sockets de de test va mo rong.
io.on("connection", (socket) => {
  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
  });

  socket.on("send-message", (payload: { roomId: string; content: string; sender: string }) => {
    io.to(payload.roomId).emit("new-message", payload);
  });
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${PORT}`);
});

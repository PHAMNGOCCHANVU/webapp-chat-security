import http from "http";
import { Server } from "socket.io";
import session from "express-session";
import app from "./app";
import { env } from "./config/env";
import { setupSocketHandlers } from "./sockets/chat.handler";
import { sessionConfig } from "./config/session";

const PORT = Number(env.PORT);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://127.0.0.1:5500",
      "http://127.0.0.1:5501",
      "http://localhost:5500",
      "http://localhost:5501",
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ],
    credentials: true,
  },
});

// Share session middleware with Socket.IO
const sessionMiddleware = sessionConfig;
io.engine.use(sessionMiddleware);

// Setup Socket.IO event handlers
setupSocketHandlers(io);

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${PORT}`);
});

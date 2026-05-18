import http from "http";
import { Server } from "socket.io";
import session from "express-session";
import app from "./app";
import { env } from "./config/env";
import { allowedOrigins } from "./config/cors";
import { setupSocketHandlers } from "./sockets/chat.handler";
import { sessionConfig } from "./config/session";

const PORT = Number(env.PORT);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins, // Load từ env qua config/cors.ts
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

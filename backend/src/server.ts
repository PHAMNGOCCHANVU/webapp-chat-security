import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { env } from "./config/env";
import { setupSocketHandlers } from "./sockets/chat.handler";

const PORT = Number(env.PORT);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ["http://127.0.0.1:5500", "http://127.0.0.1:5501", "http://localhost:5500", "http://localhost:5501"],
    credentials: true,
  },
});

setupSocketHandlers(io);

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${PORT}`);
});

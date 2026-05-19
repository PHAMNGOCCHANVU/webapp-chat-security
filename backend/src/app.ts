import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import fs from "fs";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { corsOptions } from "./config/cors";
import { env } from "./config/env";
import { globalLimiter } from "./config/rate-limit";
import { sessionConfig } from "./config/session";
import { setupSwagger } from "./config/swagger";
import { auditLogger } from "./middlewares/audit.middleware";
import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import conversationRoutes from "./routes/conversation.routes";
import friendRoutes from "./routes/friend.routes";
import messageRoutes from "./routes/message.routes";
import roomRoutes from "./routes/room.routes";

const app = express();
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const shouldServeFrontend =
  (env.NODE_ENV === "production" || process.env.SERVE_FRONTEND === "true") &&
  fs.existsSync(frontendIndexPath);

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "validator.swagger.io"],
        connectSrc: [
          "'self'",
          "ws://localhost:3000",
          "wss://localhost:3000",
          "ws://127.0.0.1:3000",
          "wss://127.0.0.1:3000",
          "ws://localhost:4000",
          "wss://localhost:4000",
          "ws://127.0.0.1:4000",
          "wss://127.0.0.1:4000",
        ],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xFrameOptions: { action: "deny" },
    noSniff: true,
  })
);

app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024,
  })
);

app.use(cors(corsOptions));
app.use(globalLimiter);
app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(morgan("dev"));
app.use(sessionConfig);

setupSwagger(app);
app.use(auditLogger);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/rooms", roomRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/friends", friendRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/conversations", conversationRoutes);

if (process.env.SERVE_FRONTEND === "true" && !shouldServeFrontend) {
  console.warn(
    `[Demo] Frontend build not found at ${frontendIndexPath}. Run the demo build step first.`
  );
}

if (shouldServeFrontend) {
  app.use(
    express.static(frontendDistPath, {
      index: false,
    })
  );

  app.get(/^\/(?!api\/|api-docs(?:\/|$)|health$).*/, (_req, res) => {
    res.sendFile(frontendIndexPath);
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message?.includes("CORS")) {
    return res.status(403).json({ error: "CORS policy violation" });
  }

  if (err.status === 413) {
    return res.status(413).json({ error: "Request payload too large (max 10KB)" });
  }

  console.error("[Error]", err.message);
  return res.status(500).json({ error: "Internal server error" });
});

export default app;

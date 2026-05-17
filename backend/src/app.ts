import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { sessionConfig } from "./config/session";
import { corsOptions } from "./config/cors";
import { globalLimiter } from "./config/rate-limit";
import { auditLogger } from "./middlewares/audit.middleware";
import authRoutes from "./routes/auth.routes";
import roomRoutes from "./routes/room.routes";
import adminRoutes from "./routes/admin.routes";
import { setupSwagger } from "./config/swagger";

const app = express();

// ── Ẩn Express server signature ──────────────────────────────────────────────
app.disable("x-powered-by");

// ── Security Headers (Helmet) — Task 6.2 ─────────────────────────────────────
app.use(
  helmet({
    // Content Security Policy tùy chỉnh cho Socket.IO + Swagger UI
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Swagger UI cần inline scripts
          "cdn.jsdelivr.net",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Swagger UI cần inline styles
          "cdn.jsdelivr.net",
        ],
        imgSrc: ["'self'", "data:", "validator.swagger.io"],
        connectSrc: [
          "'self'",
          "ws://localhost:3000",
          "wss://localhost:3000",
          "ws://127.0.0.1:3000",
          "wss://127.0.0.1:3000",
        ],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    // Tắt để tránh conflict với Swagger UI
    crossOriginEmbedderPolicy: false,
    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000,        // 1 năm
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xFrameOptions: { action: "deny" },
    noSniff: true,
  })
);

// ── Response Compression — Task 6.6 ──────────────────────────────────────────
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
    level: 6,        // Cân bằng tốc độ vs tỉ lệ nén (0–9)
    threshold: 1024, // Chỉ nén response > 1KB
  })
);

// ── CORS — Task 6.3 (load từ env, tập trung tại config/cors.ts) ──────────────
app.use(cors(corsOptions));

// ── Global Rate Limiter — Task 6.4 ───────────────────────────────────────────
app.use(globalLimiter);

// ── Body Parsing (với giới hạn 10KB) — Task 6.5 ──────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan("dev"));

// ── Session ───────────────────────────────────────────────────────────────────
app.use(sessionConfig);

// ── Swagger UI ────────────────────────────────────────────────────────────────
setupSwagger(app);

// ── Auto-Audit Middleware (sau session) — Phase 5 ─────────────────────────────
app.use(auditLogger);

// ── Health Check (không bị rate limit) ───────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/rooms", roomRoutes);
app.use("/api/v1/admin", adminRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message?.includes("CORS")) {
    return res.status(403).json({ error: "CORS policy violation" });
  }
  if (err.status === 413) {
    return res.status(413).json({ error: "Request payload too large (max 10KB)" });
  }
  console.error("[Error]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

export default app;

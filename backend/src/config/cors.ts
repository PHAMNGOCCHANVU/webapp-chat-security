import { env } from "./env";

/**
 * Danh sách origins được phép truy cập API.
 * Load từ biến môi trường ALLOWED_ORIGINS (phân cách bởi dấu phẩy).
 */
export const allowedOrigins: string[] = env.ALLOWED_ORIGINS
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * CORS options dùng chung cho Express app và Socket.IO server.
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Cho phép requests không có Origin header (ví dụ: curl, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: Origin "${origin}" not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
  maxAge: 86400, // Cache preflight response trong 24h
};

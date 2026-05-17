import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(10),
  // CORS: danh sách origins được phép, phân cách bởi dấu phẩy
  ALLOWED_ORIGINS: z.string().default(
    "http://127.0.0.1:5500,http://127.0.0.1:5501,http://localhost:5500,http://localhost:5501,http://localhost:5173,http://127.0.0.1:5173"
  ),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;

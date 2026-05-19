import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const insecureSecretValues = new Set([
  "default_jwt_secret",
  "default_jwt_refresh_secret",
  "default_session_secret",
  "changeme",
  "change_me",
  "replace_me",
  "replace-with-secure-secret",
  "your_jwt_secret",
  "your_jwt_refresh_secret",
  "your_session_secret",
]);

const strongSecretSchema = (name: string) =>
  z
    .string()
    .trim()
    .min(32, `${name} must be at least 32 characters`)
    .refine((value) => !insecureSecretValues.has(value.toLowerCase()), {
      message: `${name} is using a known placeholder and must be replaced with a random secret`,
    });

const envSchema = z.object({
  PORT: z.string().default("3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1),
  ENCRYPTION_KEY: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/, "ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"),
  SESSION_SECRET: strongSecretSchema("SESSION_SECRET"),
  JWT_SECRET: strongSecretSchema("JWT_SECRET"),
  JWT_REFRESH_SECRET: strongSecretSchema("JWT_REFRESH_SECRET"),
  ALLOWED_ORIGINS: z.string().default(
    "http://127.0.0.1:5500,http://127.0.0.1:5501,http://localhost:5500,http://localhost:5501,http://localhost:5173,http://127.0.0.1:5173"
  ),
}).superRefine((value, ctx) => {
  if (value.JWT_SECRET === value.JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["JWT_REFRESH_SECRET"],
      message: "JWT_REFRESH_SECRET must be different from JWT_SECRET",
    });
  }

  if (value.SESSION_SECRET === value.JWT_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SESSION_SECRET"],
      message: "SESSION_SECRET must be different from JWT_SECRET",
    });
  }

  if (value.SESSION_SECRET === value.JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SESSION_SECRET"],
      message: "SESSION_SECRET must be different from JWT_REFRESH_SECRET",
    });
  }
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;

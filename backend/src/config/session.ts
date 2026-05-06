import session from "express-session";
import { env } from "./env";

export const sessionConfig = session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
  // TODO: Use a proper session store (e.g. connect-redis or Prisma session store) in production.
  // We'll just use MemoryStore for local dev now, or implement Prisma store later if time permits.
});

import session from "express-session";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { prisma } from "./prisma";
import { env } from "./env";

/**
 * Express Session Configuration
 * - Session storage: Prisma (SQL Server database)
 * - Cookie: HttpOnly + Secure (HTTPS in production)
 * - Max age: 24 hours
 * - Same-site: Strict to prevent CSRF
 */
export const sessionConfig = session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new PrismaSessionStore(prisma, {
    checkPeriod: 2 * 60 * 1000, // prune expired sessions every 2 minutes
    ttl: 24 * 60 * 60, // session expires after 24 hours
  }),
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict", // prevent CSRF attacks
    maxAge: 1000 * 60 * 60 * 24, // 24 hours in milliseconds
  },
});



import { prisma } from "../config/prisma";
import { hashPassword, verifyPassword } from "../utils/password";
import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  displayName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export class AuthService {
  static async register(data: z.infer<typeof registerSchema>) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existingUser) {
      throw new Error("Username or Email already exists");
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        displayName: data.displayName,
        email: data.email,
        passwordHash: hashedPassword,
        // First user is automatically ADMIN
        role: (await prisma.user.count()) === 0 ? "ADMIN" : "USER",
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
      },
    });

    return user;
  }

  static async login(data: z.infer<typeof loginSchema>) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (user.status === "LOCKED") {
      throw new Error("Account is locked");
    }

    const isValid = await verifyPassword(user.passwordHash, data.password);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
    };
  }
}

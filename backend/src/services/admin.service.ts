import { prisma } from "../config/prisma";

export class AdminService {
  static async listUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  static async updateUserStatus(userId: string, status: "ACTIVE" | "LOCKED") {
    return prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, username: true, status: true },
    });
  }

  static async updateUserRole(userId: string, role: "USER" | "ADMIN") {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, username: true, role: true },
    });
  }

  static async getAuditLogs(filters?: { action?: string; actorId?: string }) {
    return prisma.auditLog.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { id: true, username: true, displayName: true } },
      },
      take: 100, // Limit to 100 recent logs for now
    });
  }
}

import { prisma } from "../config/prisma";

export class AdminService {
  static async listUsers() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        status: true,
        createdAt: true,
        userRoles: {
          select: {
            role: {
              select: { roleName: true },
            },
          },
        },
      },
    });

    // Transform userRoles to simple role names array
    return users.map((user) => ({
      ...user,
      roles: user.userRoles.map((ur) => ur.role.roleName),
      userRoles: undefined,
    }));
  }

  static async getUserWithRoles(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) throw new Error("User not found");
    return user;
  }

  static async updateUserStatus(userId: string, status: "ACTIVE" | "LOCKED") {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    return prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, username: true, status: true },
    });
  }

  static async updateUserRole(userId: string, newRoleName: "USER" | "ADMIN") {
    // Get the role
    const role = await prisma.role.findUnique({
      where: { roleName: newRoleName },
    });

    if (!role) throw new Error(`Role ${newRoleName} not found`);

    // Get current user roles
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
    });

    // Remove all existing roles
    if (userRoles.length > 0) {
      await prisma.userRole.deleteMany({
        where: { userId },
      });
    }

    // Assign new role
    await prisma.userRole.create({
      data: {
        userId,
        roleId: role.id,
      },
    });

    // Return updated user with new role
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    return {
      ...updatedUser,
      role: newRoleName,
    };
  }

  static async getAuditLogs(filters?: { action?: string; actor?: string }) {
    const whereClause: any = {};

    if (filters?.action) {
      whereClause.action = filters.action;
    }

    if (filters?.actor) {
      whereClause.actorId = filters.actor;
    }

    return prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      take: 100, // Limit to 100 recent logs
    });
  }

  static async deleteUser(userId: string) {
    // Prevent deleting self
    if (userId === userId) throw new Error("Cannot delete your own account");

    // Delete related data
    await prisma.userRole.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });

    // Delete user
    return prisma.user.delete({
      where: { id: userId },
      select: { id: true, username: true, email: true },
    });
  }
}

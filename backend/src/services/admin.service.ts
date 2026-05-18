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

  static async getAuditLogs(filters?: {
    action?: string;
    actorId?: string;
    startDate?: Date;
    endDate?: Date;
    targetType?: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 50));
    const skip = (page - 1) * limit;

    // Xây dựng mệnh đề WHERE động
    const whereClause: any = {};

    if (filters?.action) {
      whereClause.actionType = filters.action;
    }

    if (filters?.actorId) {
      whereClause.actorUserId = filters.actorId;
    }

    if (filters?.targetType) {
      whereClause.targetTable = filters.targetType;
    }

    if (filters?.status) {
      whereClause.actionStatus = filters.status;
    }

    // Lọc theo khoảng thời gian
    if (filters?.startDate || filters?.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        // Đặt end date tới cuối ngày (23:59:59)
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endOfDay;
      }
    }

    // Tìm kiếm trong description
    if (filters?.search) {
      whereClause.description = {
        contains: filters.search,
      };
    }

    // Thực hiện 2 query song song: lấy dữ liệu & đếm tổng
    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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

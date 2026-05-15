import { prisma } from "../config/prisma";
import { hashPassword, verifyPassword } from "../utils/password";
import { RegisterInput, LoginInput, UpdateProfileInput, ChangePasswordInput } from "./validators";

/**
 * Auth Service - Handle authentication logic
 */
export class AuthService {
  /**
   * Register a new user
   * @param input Register input data
   */
  static async register(input: RegisterInput) {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: input.email },
          { username: input.username },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === input.email) {
        throw new Error("Email already registered");
      }
      throw new Error("Username already taken");
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        passwordHash,
        status: "ACTIVE",
      },
    });

    // Assign USER role
    const userRole = await prisma.role.findUnique({
      where: { roleName: "USER" },
    });

    if (userRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: userRole.id,
        },
      });
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      status: user.status,
    };
  }

  /**
   * Login user - verify credentials
   * @param input Login input (username/email + password)
   */
  static async login(input: LoginInput) {
    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: input.username },
          { username: input.username },
        ],
      },
    });

    if (!user) {
      throw new Error("Invalid username/email or password");
    }

    // Check if account is locked
    if (user.status === "LOCKED") {
      throw new Error("Account is locked");
    }

    if (user.status === "BANNED") {
      throw new Error("Account is banned");
    }

    // Verify password
    const isPasswordValid = await verifyPassword(user.passwordHash, input.password);

    if (!isPasswordValid) {
      throw new Error("Invalid username/email or password");
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      status: user.status,
    };
  }

  /**
   * Get user profile with roles and permissions
   * @param userId User ID
   */
  static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Extract roles and permissions
    const roles = user.userRoles.map((ur) => ur.role.roleName);
    const permissions = user.userRoles
      .flatMap((ur) => ur.role.rolePermissions)
      .map((rp) => rp.permission.permissionName);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      roles: [...new Set(roles)],
      permissions: [...new Set(permissions)],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update user profile
   * @param userId User ID
   * @param input Update profile input
   */
  static async updateProfile(userId: string, input: UpdateProfileInput) {
    const updateData: any = {};

    if (input.displayName) {
      updateData.displayName = input.displayName;
    }

    if (input.avatarUrl !== undefined) {
      updateData.avatarUrl = input.avatarUrl || null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Change password
   * @param userId User ID
   * @param input Change password input
   */
  static async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify old password
    const isOldPasswordValid = await verifyPassword(user.passwordHash, input.oldPassword);

    if (!isOldPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const newPasswordHash = await hashPassword(input.newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: "Password changed successfully" };
  }

  /**
   * Check if user has role
   * @param userId User ID
   * @param roleName Role name to check
   */
  static async hasRole(userId: string, roleName: string): Promise<boolean> {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          roleName,
        },
      },
    });

    return !!userRole;
  }

  /**
   * Check if user has permission
   * @param userId User ID
   * @param permissionName Permission name to check
   */
  static async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const result = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    for (const userRole of result) {
      for (const rolePermission of userRole.role.rolePermissions) {
        if (rolePermission.permission.permissionName === permissionName) {
          return true;
        }
      }
    }

    return false;
  }
}

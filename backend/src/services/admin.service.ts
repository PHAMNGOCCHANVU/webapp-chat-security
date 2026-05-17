import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { PERMISSION_CATALOG, SYSTEM_ROLE_NAMES } from "../constants/rbac";
import { resolveAuditModuleName } from "./audit.service";
import { hashPassword } from "../utils/password";
import { userPreviewSelect } from "../utils/conversation.helper";
import { ensureSystemRbacCatalog, ensureUserHasRole } from "./rbac-catalog.service";

const STATUS_FILTER_MAP = {
  DISABLED: ["DISABLED", "BANNED"],
} as const;

const SYSTEM_ROLE_SET = new Set<string>(SYSTEM_ROLE_NAMES);
const PERMISSION_ORDER = new Map<string, number>(
  PERMISSION_CATALOG.map((permission, index) => [permission.permissionName, index] as [string, number])
);

const adminUserSelect = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  avatarUrl: true,
  phone: true,
  bio: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  userRoles: {
    select: {
      role: {
        select: { roleName: true },
      },
    },
  },
} satisfies Prisma.UserSelect;

const permissionSelect = {
  id: true,
  permissionName: true,
  description: true,
} satisfies Prisma.PermissionSelect;

const roleSelect = {
  id: true,
  roleName: true,
  description: true,
  rolePermissions: {
    include: {
      permission: {
        select: permissionSelect,
      },
    },
  },
  _count: {
    select: {
      userRoles: true,
    },
  },
} satisfies Prisma.RoleSelect;

const conversationListSelect = {
  id: true,
  conversationType: true,
  conversationName: true,
  status: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  lastMessageAt: true,
  creator: {
    select: userPreviewSelect,
  },
  _count: {
    select: {
      members: true,
    },
  },
} satisfies Prisma.ConversationSelect;

const conversationDetailSelect = {
  ...conversationListSelect,
  members: {
    include: {
      user: {
        select: userPreviewSelect,
      },
    },
  },
} satisfies Prisma.ConversationSelect;

type AdminUserRecord = Prisma.UserGetPayload<{
  select: typeof adminUserSelect;
}>;

type PermissionRecord = Prisma.PermissionGetPayload<{
  select: typeof permissionSelect;
}>;

type RoleRecord = Prisma.RoleGetPayload<{
  select: typeof roleSelect;
}>;

type ConversationListRecord = Prisma.ConversationGetPayload<{
  select: typeof conversationListSelect;
}>;

type ConversationDetailRecord = Prisma.ConversationGetPayload<{
  select: typeof conversationDetailSelect;
}>;

type CreateAdminUserInput = {
  username: string;
  displayName: string;
  email: string;
  password: string;
  phone?: string;
  bio?: string;
  status?: string;
  roles?: string[];
};

type UpdateAdminUserInput = {
  username?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  status?: string;
};

type CreateAdminRoleInput = {
  roleName: string;
  description?: string;
  permissionNames?: string[];
};

type UpdateAdminRoleInput = {
  roleName?: string;
  description?: string;
  permissionNames?: string[];
};

type CreateAdminConversationInput = {
  conversationName: string;
  memberIds: string[];
  ownerUserId?: string;
};

type UpdateAdminConversationInput = {
  conversationName?: string;
  status?: string;
};

const normalizeOptionalString = (value?: string) => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeUserStatus = (status: string) => (status === "BANNED" ? "DISABLED" : status);
const normalizeAuditStatus = (status: string) => (status === "FAILED" ? "FAILED" : "SUCCESS");

const getUniqueRoleNames = (roleNames?: string[]) => {
  const normalized = (roleNames ?? [])
    .map((roleName) => roleName.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(normalized.length ? normalized : ["USER"])];
};

const getUniquePermissionNames = (permissionNames?: string[]) =>
  [...new Set((permissionNames ?? []).map((name) => name.trim().toUpperCase()).filter(Boolean))];

const getPermissionModule = (permissionName: string) => permissionName.split("_")[0] || "GENERAL";
const parseAuditDate = (value?: string, endOfDay = false) => {
  if (!value?.trim()) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  if (endOfDay) {
    parsedDate.setHours(23, 59, 59, 999);
  } else {
    parsedDate.setHours(0, 0, 0, 0);
  }

  return parsedDate;
};

const mapPermission = (permission: PermissionRecord) => ({
  id: permission.id,
  permissionName: permission.permissionName,
  description: permission.description,
  module: getPermissionModule(permission.permissionName),
  isSystem: PERMISSION_ORDER.has(permission.permissionName),
});

const mapAdminUser = (user: AdminUserRecord) => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  email: user.email,
  avatarUrl: user.avatarUrl,
  phone: user.phone,
  bio: user.bio,
  status: normalizeUserStatus(user.status),
  roles: [...new Set(user.userRoles.map((entry) => entry.role.roleName))],
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const mapRole = (role: RoleRecord) => {
  const permissions = role.rolePermissions
    .map((entry) => mapPermission(entry.permission))
    .sort(
      (left, right) =>
        (PERMISSION_ORDER.get(left.permissionName) ?? Number.MAX_SAFE_INTEGER) -
          (PERMISSION_ORDER.get(right.permissionName) ?? Number.MAX_SAFE_INTEGER) ||
        left.permissionName.localeCompare(right.permissionName)
    );

  return {
    id: role.id,
    roleName: role.roleName,
    description: role.description,
    permissions,
    permissionNames: permissions.map((permission) => permission.permissionName),
    userCount: role._count.userRoles,
    isSystem: SYSTEM_ROLE_SET.has(role.roleName),
  };
};

const mapConversationSummary = (conversation: ConversationListRecord) => ({
  id: conversation.id,
  type: conversation.conversationType,
  status: conversation.status,
  conversationName: conversation.conversationName,
  displayName:
    conversation.conversationType === "GROUP"
      ? conversation.conversationName || "Untitled group"
      : "Direct conversation",
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
  createdBy: conversation.createdBy,
  creator: conversation.creator,
  memberCount: conversation._count.members,
  lastActivityAt: conversation.lastMessageAt ?? conversation.updatedAt,
});

const mapConversationDetail = (conversation: ConversationDetailRecord) => ({
  ...mapConversationSummary(conversation),
  members: [...conversation.members]
    .sort((left, right) => {
      if (left.memberRole === right.memberRole) {
        return left.user.displayName.localeCompare(right.user.displayName);
      }

      return left.memberRole === "OWNER" ? -1 : 1;
    })
    .map((member) => ({
      id: member.user.id,
      username: member.user.username,
      displayName: member.user.displayName,
      avatarUrl: member.user.avatarUrl,
      memberRole: member.memberRole,
      joinedAt: member.joinedAt,
    })),
});

const buildUserWhere = (filters?: { search?: string; status?: string }): Prisma.UserWhereInput => {
  const whereClause: Prisma.UserWhereInput = {};
  const search = filters?.search?.trim();
  const status = filters?.status?.trim().toUpperCase();

  if (search) {
    whereClause.OR = [
      { username: { contains: search } },
      { email: { contains: search } },
      { displayName: { contains: search } },
    ];
  }

  if (status && status !== "ALL") {
    if (status in STATUS_FILTER_MAP) {
      whereClause.status = {
        in: [...STATUS_FILTER_MAP[status as keyof typeof STATUS_FILTER_MAP]],
      };
    } else {
      whereClause.status = status;
    }
  }

  return whereClause;
};

const buildConversationWhere = (filters?: {
  search?: string;
  type?: string;
  status?: string;
}): Prisma.ConversationWhereInput => {
  const whereClause: Prisma.ConversationWhereInput = {};
  const search = filters?.search?.trim();
  const type = filters?.type?.trim().toUpperCase();
  const status = filters?.status?.trim().toUpperCase();

  if (search) {
    whereClause.OR = [
      { id: { contains: search } },
      { conversationName: { contains: search } },
      { creator: { username: { contains: search } } },
      { creator: { displayName: { contains: search } } },
    ];
  }

  if (type && type !== "ALL") {
    whereClause.conversationType = type === "DIRECT" ? "PRIVATE" : type;
  }

  if (status && status !== "ALL") {
    whereClause.status = status;
  }

  return whereClause;
};

export class AdminService {
  private static async getRoleById(roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: roleSelect,
    });

    if (!role) {
      throw new Error("Role not found");
    }

    return mapRole(role);
  }

  private static async getConversationById(conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: conversationDetailSelect,
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    return mapConversationDetail(conversation);
  }

  static async listUsers(filters?: { search?: string; status?: string }) {
    const users = await prisma.user.findMany({
      where: buildUserWhere(filters),
      select: adminUserSelect,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return users.map(mapAdminUser);
  }

  static async listPermissions() {
    await ensureSystemRbacCatalog(prisma);

    const permissions = await prisma.permission.findMany({
      select: permissionSelect,
      orderBy: { permissionName: "asc" },
    });

    return permissions
      .map(mapPermission)
      .sort(
        (left, right) =>
          (PERMISSION_ORDER.get(left.permissionName) ?? Number.MAX_SAFE_INTEGER) -
            (PERMISSION_ORDER.get(right.permissionName) ?? Number.MAX_SAFE_INTEGER) ||
          left.permissionName.localeCompare(right.permissionName)
      );
  }

  static async listRoles() {
    await ensureSystemRbacCatalog(prisma);

    const roles = await prisma.role.findMany({
      select: roleSelect,
      orderBy: { roleName: "asc" },
    });

    return roles
      .map(mapRole)
      .sort((left, right) => {
        const leftSystemWeight = left.isSystem ? 0 : 1;
        const rightSystemWeight = right.isSystem ? 0 : 1;
        return leftSystemWeight - rightSystemWeight || left.roleName.localeCompare(right.roleName);
      });
  }

  static async createRole(input: CreateAdminRoleInput) {
    await ensureSystemRbacCatalog(prisma);

    const normalizedRoleName = input.roleName.trim().toUpperCase();
    const permissionNames = getUniquePermissionNames(input.permissionNames);

    const permissions = await prisma.permission.findMany({
      where: {
        permissionName: {
          in: permissionNames,
        },
      },
      select: permissionSelect,
    });

    if (permissionNames.length !== permissions.length) {
      throw new Error("One or more permissions are invalid");
    }

    const role = await prisma.$transaction(async (tx) => {
      const createdRole = await tx.role.create({
        data: {
          roleName: normalizedRoleName,
          description: normalizeOptionalString(input.description) ?? null,
        },
      });

      for (const permission of permissions) {
        await tx.rolePermission.create({
          data: {
            roleId: createdRole.id,
            permissionId: permission.id,
          },
        });
      }

      return createdRole;
    });

    return this.getRoleById(role.id);
  }

  static async updateRole(roleId: string, input: UpdateAdminRoleInput) {
    await ensureSystemRbacCatalog(prisma);

    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        roleName: true,
      },
    });

    if (!existingRole) {
      throw new Error("Role not found");
    }

    const isSystemRole = SYSTEM_ROLE_SET.has(existingRole.roleName);
    const nextRoleName = input.roleName?.trim().toUpperCase();

    if (isSystemRole && nextRoleName && nextRoleName !== existingRole.roleName) {
      throw new Error("System roles cannot be renamed");
    }

    const permissionNames = input.permissionNames
      ? getUniquePermissionNames(input.permissionNames)
      : null;

    const permissions = permissionNames
      ? await prisma.permission.findMany({
          where: {
            permissionName: {
              in: permissionNames,
            },
          },
          select: permissionSelect,
        })
      : null;

    if (permissionNames && permissionNames.length !== permissions?.length) {
      throw new Error("One or more permissions are invalid");
    }

    await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id: roleId },
        data: {
          roleName: nextRoleName ?? undefined,
          description:
            input.description !== undefined
              ? normalizeOptionalString(input.description)
              : undefined,
        },
      });

      if (permissions) {
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        for (const permission of permissions) {
          await tx.rolePermission.create({
            data: {
              roleId,
              permissionId: permission.id,
            },
          });
        }
      }
    });

    return this.getRoleById(roleId);
  }

  static async deleteRole(roleId: string) {
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
      select: roleSelect,
    });

    if (!existingRole) {
      throw new Error("Role not found");
    }

    if (SYSTEM_ROLE_SET.has(existingRole.roleName)) {
      throw new Error("System roles cannot be deleted");
    }

    if (existingRole._count.userRoles > 0) {
      throw new Error("Cannot delete a role that is still assigned to users");
    }

    await prisma.role.delete({
      where: { id: roleId },
    });

    return mapRole(existingRole);
  }

  static async getUserWithRoles(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...adminUserSelect,
        _count: {
          select: {
            conversationMembers: true,
            createdMessages: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      ...mapAdminUser(user),
      conversationCount: user._count.conversationMembers,
      messageCount: user._count.createdMessages,
      auditLogCount: user._count.auditLogs,
    };
  }

  static async createUser(input: CreateAdminUserInput) {
    await ensureSystemRbacCatalog(prisma);

    const roleNames = getUniqueRoleNames(input.roles);
    const roles = await prisma.role.findMany({
      where: {
        roleName: {
          in: roleNames,
        },
      },
    });

    if (roles.length !== roleNames.length) {
      throw new Error("One or more roles are invalid");
    }

    try {
      const user = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            username: input.username.trim(),
            displayName: input.displayName.trim(),
            email: input.email.trim().toLowerCase(),
            passwordHash: await hashPassword(input.password),
            phone: normalizeOptionalString(input.phone),
            bio: normalizeOptionalString(input.bio),
            status: input.status ?? "ACTIVE",
          },
          select: adminUserSelect,
        });

        for (const role of roles) {
          await tx.userRole.create({
            data: {
              userId: createdUser.id,
              roleId: role.id,
            },
          });
        }

        const hydratedUser = await tx.user.findUnique({
          where: { id: createdUser.id },
          select: adminUserSelect,
        });

        if (!hydratedUser) {
          throw new Error("User was created but could not be reloaded");
        }

        return hydratedUser;
      });

      return mapAdminUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(", ")
          : String(error.meta?.target ?? "");

        if (target.includes("email")) {
          throw new Error("Email already registered");
        }

        if (target.includes("username")) {
          throw new Error("Username already taken");
        }

        if (target.includes("phone")) {
          throw new Error("Phone number already in use");
        }

        throw new Error("A user with the same unique information already exists");
      }

      throw error;
    }
  }

  static async updateUser(userId: string, input: UpdateAdminUserInput) {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existingUser) {
      throw new Error("User not found");
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (input.username !== undefined) {
      updateData.username = input.username.trim();
    }

    if (input.displayName !== undefined) {
      updateData.displayName = input.displayName.trim();
    }

    if (input.email !== undefined) {
      updateData.email = input.email.trim().toLowerCase();
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    const nextPhone = normalizeOptionalString(input.phone);
    if (nextPhone !== undefined) {
      updateData.phone = nextPhone;
    }

    const nextBio = normalizeOptionalString(input.bio);
    if (nextBio !== undefined) {
      updateData.bio = nextBio;
    }

    const nextAvatarUrl = normalizeOptionalString(input.avatarUrl);
    if (nextAvatarUrl !== undefined) {
      updateData.avatarUrl = nextAvatarUrl;
    }

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: adminUserSelect,
      });

      if (input.status === "DELETED") {
        await prisma.session.deleteMany({
          where: { userId },
        });
      }

      return mapAdminUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(", ")
          : String(error.meta?.target ?? "");

        if (target.includes("email")) {
          throw new Error("Email already registered");
        }

        if (target.includes("username")) {
          throw new Error("Username already taken");
        }

        if (target.includes("phone")) {
          throw new Error("Phone number already in use");
        }
      }

      throw error;
    }
  }

  static async updateUserStatus(userId: string, status: "ACTIVE" | "LOCKED" | "DISABLED" | "DELETED") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, status: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, username: true, status: true },
    });

    if (status === "DELETED") {
      await prisma.session.deleteMany({
        where: { userId },
      });
    }

    return {
      ...updatedUser,
      previousStatus: normalizeUserStatus(user.status),
    };
  }

  static async assignRole(userId: string, roleName: string) {
    await ensureSystemRbacCatalog(prisma);

    const normalizedRoleName = roleName.trim().toUpperCase();
    const [user, role] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      prisma.role.findUnique({
        where: { roleName: normalizedRoleName },
      }),
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    if (!role) {
      throw new Error(`Role ${normalizedRoleName} not found`);
    }

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId,
        roleId: role.id,
      },
    });

    return this.getUserWithRoles(userId);
  }

  static async revokeRole(userId: string, roleName: string) {
    const normalizedRoleName = roleName.trim().toUpperCase();
    const [user, role] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      prisma.role.findUnique({
        where: { roleName: normalizedRoleName },
      }),
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    if (!role) {
      throw new Error(`Role ${normalizedRoleName} not found`);
    }

    await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId: role.id,
      },
    });

    const remainingRoles = await prisma.userRole.findMany({
      where: { userId },
      select: { roleId: true },
    });

    if (!remainingRoles.length) {
      await ensureUserHasRole(prisma, userId, "USER");
    }

    return this.getUserWithRoles(userId);
  }

  static async listConversations(filters?: { search?: string; type?: string; status?: string }) {
    const conversations = await prisma.conversation.findMany({
      where: buildConversationWhere(filters),
      select: conversationListSelect,
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    });

    return conversations.map(mapConversationSummary);
  }

  static async getConversation(conversationId: string) {
    return this.getConversationById(conversationId);
  }

  static async createConversation(actorUserId: string, input: CreateAdminConversationInput) {
    await ensureSystemRbacCatalog(prisma);

    const normalizedMemberIds = Array.from(
      new Set(input.memberIds.map((memberId) => memberId.trim()).filter(Boolean))
    );
    const ownerUserId = input.ownerUserId?.trim() || actorUserId;
    const allMemberIds = Array.from(new Set([ownerUserId, ...normalizedMemberIds]));

    if (allMemberIds.length < 3) {
      throw new Error("Group conversations must contain at least 3 unique members");
    }

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: allMemberIds,
        },
        status: {
          not: "DELETED",
        },
      },
      select: userPreviewSelect,
    });

    if (users.length !== allMemberIds.length) {
      throw new Error("One or more conversation members were not found");
    }

    const createdConversation = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          conversationType: "GROUP",
          conversationName: input.conversationName.trim(),
          status: "ACTIVE",
          createdBy: ownerUserId,
          members: {
            create: allMemberIds.map((memberId) => ({
              userId: memberId,
              memberRole: memberId === ownerUserId ? "OWNER" : "MEMBER",
              unreadCount: 0,
            })),
          },
        },
        select: {
          id: true,
        },
      });

      await ensureUserHasRole(tx, ownerUserId, "OWNER");
      return conversation;
    });

    return this.getConversationById(createdConversation.id);
  }

  static async updateConversation(conversationId: string, input: UpdateAdminConversationInput) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        conversationType: true,
      },
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.conversationType !== "GROUP") {
      throw new Error("Only group conversations can be updated from admin management");
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        conversationName:
          input.conversationName !== undefined
            ? normalizeOptionalString(input.conversationName)
            : undefined,
        status: input.status,
      },
    });

    return this.getConversationById(conversationId);
  }

  static async updateConversationStatus(conversationId: string, status: "ACTIVE" | "ARCHIVED" | "DELETED") {
    return this.updateConversation(conversationId, { status });
  }

  static async addConversationMembers(conversationId: string, memberIds: string[]) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: true,
      },
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.conversationType !== "GROUP") {
      throw new Error("Members can only be managed for group conversations");
    }

    if (conversation.status === "DELETED") {
      throw new Error("Cannot modify members of a deleted conversation");
    }

    const normalizedMemberIds = Array.from(new Set(memberIds.map((memberId) => memberId.trim()).filter(Boolean)));
    const existingMemberIds = new Set(conversation.members.map((member) => member.userId));
    const memberIdsToAdd = normalizedMemberIds.filter((memberId) => !existingMemberIds.has(memberId));

    if (!memberIdsToAdd.length) {
      return this.getConversationById(conversationId);
    }

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: memberIdsToAdd,
        },
        status: {
          not: "DELETED",
        },
      },
      select: userPreviewSelect,
    });

    if (users.length !== memberIdsToAdd.length) {
      throw new Error("One or more members could not be added");
    }

    for (const memberId of memberIdsToAdd) {
      await prisma.conversationMember.create({
        data: {
          conversationId,
          userId: memberId,
          memberRole: "MEMBER",
        },
      });
    }

    return this.getConversationById(conversationId);
  }

  static async removeConversationMember(conversationId: string, targetUserId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: true,
      },
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.conversationType !== "GROUP") {
      throw new Error("Members can only be removed from group conversations");
    }

    const targetMember = conversation.members.find((member) => member.userId === targetUserId);

    if (!targetMember) {
      throw new Error("User is not a member of this conversation");
    }

    await prisma.$transaction(async (tx) => {
      await tx.conversationMember.delete({
        where: {
          conversationId_userId: {
            conversationId,
            userId: targetUserId,
          },
        },
      });

      const remainingMembers = await tx.conversationMember.findMany({
        where: { conversationId },
        orderBy: { joinedAt: "asc" },
      });

      if (!remainingMembers.length) {
        await tx.conversation.update({
          where: { id: conversationId },
          data: {
            status: "DELETED",
          },
        });
        return;
      }

      const hasOwner = remainingMembers.some((member) => member.memberRole === "OWNER");
      if (!hasOwner) {
        await tx.conversationMember.update({
          where: {
            conversationId_userId: {
              conversationId,
              userId: remainingMembers[0].userId,
            },
          },
          data: {
            memberRole: "OWNER",
          },
        });
      }
    });

    return this.getConversationById(conversationId);
  }

  static async getAuditLogs(filters?: {
    action?: string;
    actor?: string;
    actorId?: string;
    module?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const whereConditions: Prisma.AuditLogWhereInput[] = [];
    const action = filters?.action?.trim().toUpperCase();
    const actor = filters?.actor?.trim();
    const actorId = filters?.actorId?.trim();
    const moduleName = filters?.module?.trim().toUpperCase();
    const status = filters?.status?.trim().toUpperCase();
    const dateFrom = parseAuditDate(filters?.dateFrom);
    const dateTo = parseAuditDate(filters?.dateTo, true);
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(300, Math.max(1, filters?.limit ?? 300));

    if (action && action !== "ALL") {
      whereConditions.push({ actionType: action });
    }

    if (actor || actorId) {
      const actorKeyword = actor || actorId!;
      whereConditions.push({
        OR: [
          { actorUserId: actorKeyword },
          { actor: { is: { username: { contains: actorKeyword } } } },
          { actor: { is: { displayName: { contains: actorKeyword } } } },
          { actor: { is: { email: { contains: actorKeyword } } } },
        ],
      });
    }

    if (moduleName && moduleName !== "ALL") {
      whereConditions.push({
        OR: [
          { moduleName },
          { targetTable: moduleName },
        ],
      });
    }

    if (status && status !== "ALL") {
      whereConditions.push({ actionStatus: status });
    }

    if (dateFrom || dateTo) {
      whereConditions.push({
        createdAt: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        },
      });
    }

    const logs = await prisma.auditLog.findMany({
      where: whereConditions.length ? { AND: whereConditions } : undefined,
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
      skip: (page - 1) * limit,
      take: limit,
    });

    return logs.map((log) => ({
      ...log,
      moduleName: log.moduleName || resolveAuditModuleName(log.actionType, log.targetTable),
      userAgent: log.userAgent,
      actionStatus: normalizeAuditStatus(log.actionStatus),
    }));
  }

  static async getAuditLog(logId: string) {
    const log = await prisma.auditLog.findUnique({
      where: { id: logId },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!log) {
      throw new Error("Audit log not found");
    }

    return {
      ...log,
      moduleName: log.moduleName || resolveAuditModuleName(log.actionType, log.targetTable),
      userAgent: log.userAgent,
      actionStatus: normalizeAuditStatus(log.actionStatus),
    };
  }

  static async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, status: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: "DELETED" },
    });

    await prisma.session.deleteMany({
      where: { userId },
    });

    return {
      ...user,
      status: "DELETED",
    };
  }

  static async getSystemStats() {
    await ensureSystemRbacCatalog(prisma);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      lockedUsers,
      disabledUsers,
      deletedUsers,
      admins,
      totalRoles,
      totalConversations,
      groupConversations,
      totalMessages,
      totalAuditLogs,
      auditLogsToday,
      failedLogins,
      failedLoginsToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { status: "ACTIVE" },
      }),
      prisma.user.count({
        where: { status: "LOCKED" },
      }),
      prisma.user.count({
        where: { status: { in: ["DISABLED", "BANNED"] } },
      }),
      prisma.user.count({
        where: { status: "DELETED" },
      }),
      prisma.user.count({
        where: {
          status: {
            not: "DELETED",
          },
          userRoles: {
            some: {
              role: { roleName: "ADMIN" },
            },
          },
        },
      }),
      prisma.role.count(),
      prisma.conversation.count(),
      prisma.conversation.count({
        where: {
          conversationType: "GROUP",
        },
      }),
      prisma.message.count(),
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.auditLog.count({
        where: {
          OR: [
            { actionType: "LOGIN_FAILED" },
            {
              actionType: "LOGIN",
              actionStatus: "FAILED",
            },
          ],
        },
      }),
      prisma.auditLog.count({
        where: {
          OR: [
            { actionType: "LOGIN_FAILED" },
            {
              actionType: "LOGIN",
              actionStatus: "FAILED",
            },
          ],
          createdAt: { gte: startOfToday },
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      admins,
      totalRoles,
      lockedUsers,
      disabledUsers,
      deletedUsers,
      inactiveUsers: totalUsers - activeUsers,
      totalConversations,
      groupConversations,
      directConversations: totalConversations - groupConversations,
      totalMessages,
      totalAuditLogs,
      auditLogsToday,
      failedLogins,
      failedLoginsToday,
    };
  }
}

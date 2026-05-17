import { Prisma, PrismaClient } from "@prisma/client";
import { PERMISSION_CATALOG, SYSTEM_ROLES } from "../constants/rbac";

type PrismaExecutor = Prisma.TransactionClient | PrismaClient;

export async function ensureSystemRbacCatalog(prismaDb: PrismaExecutor) {
  const roleMap = new Map<string, { id: string }>();

  for (const roleConfig of SYSTEM_ROLES) {
    const role = await prismaDb.role.upsert({
      where: { roleName: roleConfig.roleName },
      update: {
        description: roleConfig.description,
      },
      create: {
        roleName: roleConfig.roleName,
        description: roleConfig.description,
      },
    });

    roleMap.set(role.roleName, { id: role.id });
  }

  const permissionMap = new Map<string, { id: string }>();

  for (const permissionConfig of PERMISSION_CATALOG) {
    const permission = await prismaDb.permission.upsert({
      where: { permissionName: permissionConfig.permissionName },
      update: {
        description: permissionConfig.description,
      },
      create: permissionConfig,
    });

    permissionMap.set(permission.permissionName, { id: permission.id });
  }

  for (const roleConfig of SYSTEM_ROLES) {
    const roleId = roleMap.get(roleConfig.roleName)?.id;
    if (!roleId) {
      continue;
    }

    for (const permissionName of roleConfig.permissionNames) {
      const permissionId = permissionMap.get(permissionName)?.id;
      if (!permissionId) {
        continue;
      }

      await prismaDb.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId,
        },
      });
    }
  }
}

export async function ensureUserHasRole(
  prismaDb: PrismaExecutor,
  userId: string,
  roleName: string
) {
  const role = await prismaDb.role.findUnique({
    where: { roleName },
  });

  if (!role) {
    return;
  }

  await prismaDb.userRole.upsert({
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
}

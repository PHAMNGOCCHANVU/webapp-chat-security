import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Roles
  const userRole = await prisma.role.upsert({
    where: { roleName: 'USER' },
    update: {},
    create: {
      roleName: 'USER',
      description: 'Normal user with chat and group management permissions',
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { roleName: 'ADMIN' },
    update: {},
    create: {
      roleName: 'ADMIN',
      description: 'System administrator with full access',
    },
  });

  console.log(`✓ Roles created: ${userRole.roleName}, ${adminRole.roleName}`);

  // Create Permissions
  const permissions = await Promise.all([
    prisma.permission.upsert({
      where: { permissionName: 'SEND_MESSAGE' },
      update: {},
      create: {
        permissionName: 'SEND_MESSAGE',
        description: 'Send messages in conversations',
      },
    }),
    prisma.permission.upsert({
      where: { permissionName: 'CREATE_GROUP' },
      update: {},
      create: {
        permissionName: 'CREATE_GROUP',
        description: 'Create group conversations',
      },
    }),
    prisma.permission.upsert({
      where: { permissionName: 'MANAGE_USERS' },
      update: {},
      create: {
        permissionName: 'MANAGE_USERS',
        description: 'Manage user accounts and permissions',
      },
    }),
    prisma.permission.upsert({
      where: { permissionName: 'VIEW_AUDIT_LOGS' },
      update: {},
      create: {
        permissionName: 'VIEW_AUDIT_LOGS',
        description: 'View system audit logs',
      },
    }),
  ]);

  console.log(`✓ Permissions created: ${permissions.map((p) => p.permissionName).join(', ')}`);

  // Assign permissions to USER role
  const userPermissions = permissions.filter((p) =>
    ['SEND_MESSAGE', 'CREATE_GROUP'].includes(p.permissionName)
  );

  for (const perm of userPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: userRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: userRole.id,
        permissionId: perm.id,
      },
    });
  }

  console.log(`✓ USER role assigned permissions: SEND_MESSAGE, CREATE_GROUP`);

  // Assign all permissions to ADMIN role
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }

  console.log(`✓ ADMIN role assigned all permissions`);

  console.log('✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

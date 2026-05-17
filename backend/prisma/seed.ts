import { PrismaClient } from "@prisma/client";
import { ensureSystemRbacCatalog, ensureUserHasRole } from "../src/services/rbac-catalog.service";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding RBAC catalog...");
  await ensureSystemRbacCatalog(prisma);
  console.log("RBAC catalog seeded successfully.");

  console.log("Seeding default users...");

  // Seed Admin user
  const adminPasswordHash = await hashPassword("Admin@123");
  const adminUser = await prisma.user.upsert({
    where: { username: "Admin" },
    update: {
      passwordHash: adminPasswordHash,
      displayName: "Administrator",
      email: "admin@zalegram.local",
      status: "ACTIVE",
    },
    create: {
      username: "Admin",
      email: "admin@zalegram.local",
      displayName: "Administrator",
      passwordHash: adminPasswordHash,
      status: "ACTIVE",
    },
  });
  await ensureUserHasRole(prisma, adminUser.id, "ADMIN");
  console.log(`Admin user seeded: Username = ${adminUser.username}, Password = Admin@123`);

  // Seed user_demo user
  const demoPasswordHash = await hashPassword("User@123");
  const demoUser = await prisma.user.upsert({
    where: { username: "user_demo" },
    update: {
      passwordHash: demoPasswordHash,
      displayName: "Người dùng demo",
      email: "user.demo@zalegram.local",
      status: "ACTIVE",
    },
    create: {
      username: "user_demo",
      email: "user.demo@zalegram.local",
      displayName: "Người dùng demo",
      passwordHash: demoPasswordHash,
      status: "ACTIVE",
    },
  });
  await ensureUserHasRole(prisma, demoUser.id, "USER");
  console.log(`Demo user seeded: Username = ${demoUser.username}, Password = User@123`);

  console.log("All default users seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking users in database...");
  try {
    const users = await prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
    console.log("SUCCESS! Users count:", users.length);
    users.forEach(u => {
      console.log(`- Username: ${u.username}, Email: ${u.email}, Status: ${u.status}, Roles: ${u.userRoles.map(ur => ur.role.roleName).join(", ")}`);
    });
  } catch (err: any) {
    console.error("FAILED to connect or query database:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function resetDatabase() {
  try {
    console.log("Starting database reset (deleting rows only)...");

    // 1) role_permissions
    const rp = await db.rolePermission.deleteMany();
    console.log(`Deleted ${rp.count} rows from role_permissions`);

    // 2) user_roles
    const ur = await db.userRole.deleteMany();
    console.log(`Deleted ${ur.count} rows from user_roles`);

    // 3) editorials (optional)
    if (db.editorial) {
      const ed = await db.editorial.deleteMany();
      console.log(`Deleted ${ed.count} rows from editorials`);
    } else {
      console.log("Editorials table not present in Prisma schema; skipping.");
    }

    // 4) users
    const users = await db.user.deleteMany();
    console.log(`Deleted ${users.count} rows from users`);

    // 5) roles
    const roles = await db.role.deleteMany();
    console.log(`Deleted ${roles.count} rows from roles`);

    // 6) permissions
    const perms = await db.permission.deleteMany();
    console.log(`Deleted ${perms.count} rows from permissions`);

    console.log("\nDatabase reset completed successfully.");
  } catch (err) {
    console.error("Database reset failed:", err);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

resetDatabase();

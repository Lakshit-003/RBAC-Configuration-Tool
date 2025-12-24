const { PrismaClient } = require("@prisma/client");
(async () => {
  const db = new PrismaClient();
  try {
    const u = await db.user.findUnique({
      where: { email: "admin@example.com" },
    });
    console.log(u ? { id: u.id, email: u.email } : "not found");
  } catch (e) {
    console.error("error", e.message);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
})();

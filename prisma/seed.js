// Try to load environment variables (.env.local); prefer dotenv but fallback to manual parse if not installed
try {
  require("dotenv").config();
} catch (e) {
  const fs = require("fs");
  const path = require("path");
  try {
    const envPath = path.resolve(__dirname, "..", ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      content.split(/\r?\n/).forEach((line) => {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (m) {
          const key = m[1];
          let val = m[2];
          val = val.replace(/^\"|\"$/g, "").replace(/^\'|\'$/g, "");
          process.env[key] = val;
        }
      });
      console.log("Reload env: .env.local");
    }
  } catch (err) {
    /* ignore */
  }
}

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const db = new PrismaClient();

async function main() {
  // Admin credentials are provided via environment variables (do NOT hardcode secrets)
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const editorEmail = process.env.DEFAULT_EDITOR_EMAIL || "editor@example.com";

  const saltRounds = 12;

  // Ensure essential roles exist (include 'viewer')
  const roles = ["admin", "editor", "viewer"];
  const roleRecords = {};
  for (const name of roles) {
    roleRecords[name] = await db.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Ensured roles:", Object.keys(roleRecords));

  // ==============================
  // Ensure permissions and role->permission mappings (idempotent)
  // ==============================
  const permissionNames = [
    // Admin permissions
    "dashboard:access",
    "role:create",
    "role:update",
    "role:delete",
    "permission:view",
    "permission:update",
    "user:grant:editor",
    "user:revoke:editor",
    "journal:view",
    "journal:create",
    "journal:edit:any",
    "journal:delete:any",
    // Editor-only (own) permissions
    "journal:edit:own",
    "journal:delete:own",
  ];

  const permRecords = {};
  for (const name of permissionNames) {
    permRecords[name] = await db.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Ensured permissions:", Object.keys(permRecords).length);

  // Define role -> permission mapping according to the authoritative spec
  const rolePermissionMap = {
    admin: [
      "dashboard:access",
      "role:create",
      "role:update",
      "role:delete",
      "permission:view",
      "permission:update",
      "user:grant:editor",
      "user:revoke:editor",
      "journal:view",
      "journal:create",
      "journal:edit:any",
      "journal:delete:any",
    ],
    editor: [
      "journal:view",
      "journal:create",
      "journal:edit:own",
      "journal:delete:own",
    ],
    viewer: ["journal:view"],
  };

  // Ensure role_permissions exist (idempotent)
  for (const [roleName, perms] of Object.entries(rolePermissionMap)) {
    const role = roleRecords[roleName];
    if (!role) continue;
    for (const p of perms) {
      const perm = permRecords[p];
      if (!perm) continue;
      const existing = await db.rolePermission
        .findUnique({
          where: {
            roleId_permissionId: { roleId: role.id, permissionId: perm.id },
          },
        })
        .catch(() => null);
      if (!existing) {
        await db.rolePermission.create({
          data: { roleId: role.id, permissionId: perm.id },
        });
        console.log(`Assigned permission '${p}' to role '${roleName}'`);
      }
    }
  }

  // Create admin user only when ADMIN_EMAIL and ADMIN_PASSWORD are provided
  let admin = null;
  if (adminEmail && adminPassword) {
    const adminHash = await bcrypt.hash(adminPassword, saltRounds);

    admin = await db.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      admin = await db.user.create({
        data: { email: adminEmail, password: adminHash },
      });
      console.log("Created admin user:", adminEmail);
    } else {
      console.log("Admin user already exists:", adminEmail);
      await db.user.update({
        where: { id: admin.id },
        data: { password: adminHash },
      });
      console.log(
        "Updated admin password from ADMIN_PASSWORD environment variable."
      );
    }

    // Link admin role (ensure admin user has admin role)
    const adminRoleId = roleRecords["admin"].id;

    const adminRoleLink = await db.userRole
      .findUnique({
        where: { userId_roleId: { userId: admin.id, roleId: adminRoleId } },
      })
      .catch(() => null);
    if (!adminRoleLink) {
      await db.userRole.create({
        data: { userId: admin.id, roleId: adminRoleId },
      });
      console.log("Assigned admin role to", adminEmail);
    }

    // Remove admin role from any other users (optional safety step)
    const otherAdminLinks = await db.userRole.findMany({
      where: { roleId: adminRoleId },
    });
    for (const link of otherAdminLinks) {
      if (link.userId !== admin.id) {
        await db.userRole.delete({
          where: {
            userId_roleId: { userId: link.userId, roleId: adminRoleId },
          },
        });
        console.log("Removed admin role from userId:", link.userId);
      }
    }
  } else {
    console.warn(
      "ADMIN_EMAIL and ADMIN_PASSWORD are not set; skipping admin bootstrap."
    );
  }

  // Create a default editor user
  const defaultEditorPassword =
    process.env.DEFAULT_EDITOR_PASSWORD || "Editor@1234";
  const editorHash = await bcrypt.hash(defaultEditorPassword, saltRounds);

  let editor = await db.user.findUnique({ where: { email: editorEmail } });
  if (!editor) {
    editor = await db.user.create({
      data: { email: editorEmail, password: editorHash },
    });
    console.log("Created editor user:", editorEmail);
  }
  const editorRoleId = roleRecords["editor"].id;
  const editorRoleLink = await db.userRole
    .findUnique({
      where: { userId_roleId: { userId: editor.id, roleId: editorRoleId } },
    })
    .catch(() => null);
  if (!editorRoleLink) {
    await db.userRole.create({
      data: { userId: editor.id, roleId: editorRoleId },
    });
    console.log("Assigned editor role to", editorEmail);
  }

  // Create sample editorials (use admin as author when available)
  const existing = await db.editorial.findMany();
  if (existing.length === 0) {
    if (admin) {
      await db.editorial.create({
        data: {
          title: "Admin Post",
          content: "This post was created by admin.",
          authorId: admin.id,
        },
      });
    }

    await db.editorial.create({
      data: {
        title: "Editor Post",
        content: "This post was created by editor.",
        authorId: editor.id,
      },
    });

    console.log("Created sample editorials");
  } else {
    console.log("Editorials exist, skipping creation");
  }

  console.log("\nSeed complete.");
  if (admin) {
    console.log(
      `Default admin email: ${adminEmail} (password set via ADMIN_PASSWORD env var)`
    );
  } else {
    console.log(
      "No admin was created (ADMIN_EMAIL and/or ADMIN_PASSWORD not set)."
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

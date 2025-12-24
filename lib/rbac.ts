/**
 * RBAC Utilities
 *
 * Authorization is resolved from the database on every request:
 * User -> Roles -> Permissions
 *
 * - Admin role is a superuser and bypasses permission checks.
 * - No permissions are hardcoded; all come from the DB.
 */

import { db } from "@/lib/db"

type RolePermissionResult = {
  roles: Set<string>
  permissions: Set<string>
}

async function getUserRolesAndPermissions(userId: string): Promise<RolePermissionResult> {
  const roleRecords = await db.userRole.findMany({
    where: { userId },
    select: {
      role: {
        select: {
          name: true,
          rolePermissions: {
            select: {
              permission: {
                select: { name: true },
              },
            },
          },
        },
      },
    },
  })

  const roles = new Set<string>()
  const permissions = new Set<string>()

  for (const record of roleRecords) {
    const roleName = record.role.name
    roles.add(roleName)

    for (const rp of record.role.rolePermissions) {
      permissions.add(rp.permission.name)
    }
  }

  return { roles, permissions }
}

/**
 * Check if a user has the required permission.
 * Admin role bypasses checks.
 */
export async function hasPermission(userId: string, permissionName: string): Promise<boolean> {
  const { roles, permissions } = await getUserRolesAndPermissions(userId)

  // Admin is superuser
  if (roles.has("admin")) return true

  return permissions.has(permissionName)
}

/**
 * Check if user is an admin.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const { roles } = await getUserRolesAndPermissions(userId)
  return roles.has("admin")
}


/**
 * RBAC Middleware Helpers
 *
 * Usage (after authentication):
 *
 * export async function POST(request: NextRequest) {
 *   const auth = await withAuth(request)
 *   if (auth instanceof NextResponse) return auth
 *
 *   const authz = await requirePermission(auth.user.id, "edit:post")
 *   if (authz instanceof NextResponse) return authz
 *
 *   // protected logic here
 * }
 */

import { NextResponse } from "next/server"
import { hasPermission, isAdmin } from "@/lib/rbac"

/**
 * Enforce that the user has a given permission.
 * Returns NextResponse 403 when unauthorized, otherwise `true`.
 */
export async function requirePermission(userId: string, permissionName: string) {
  const allowed = await hasPermission(userId, permissionName)
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: missing permission" }, { status: 403 })
  }

  return true
}

/**
 * Enforce that the user is an admin.
 */
export async function requireAdmin(userId: string) {
  const admin = await isAdmin(userId)
  if (!admin) {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }
  return true
}


/**
 * Example protected API route demonstrating authentication + RBAC authorization.
 *
 * POST /api/protected-example
 * Requires permission: "edit:post"
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/middleware/auth"
import { requirePermission } from "@/middleware/rbac"

export async function POST(request: NextRequest) {
  const auth = await withAuth(request)
  if (auth instanceof NextResponse) return auth

  const authorized = await requirePermission(auth.user.id, "edit:post")
  if (authorized instanceof NextResponse) return authorized

  return NextResponse.json({ message: "You are authorized to edit posts." }, { status: 200 })
}


import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/middleware/auth"

// GET /api/permissions/[id]/roles - list roles for a permission (auth required)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await withAuth(request)
  if (auth instanceof NextResponse) return auth

  const { id } = params

  const permission = await db.permission.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      roles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
          },
        },
      },
    },
  })

  if (!permission) {
    return NextResponse.json({ error: "Permission not found" }, { status: 404 })
  }

  const roles = permission.roles.map((r) => r.role)

  return NextResponse.json({ permission: { id: permission.id, name: permission.name }, roles }, { status: 200 })
}


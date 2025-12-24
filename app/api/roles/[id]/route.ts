import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/middleware/auth"
import { requireAdmin } from "@/middleware/rbac"

// PUT /api/roles/[id] - update role name (admin only)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await withAuth(request)
  if (auth instanceof NextResponse) return auth

  const adminCheck = await requireAdmin(auth.user.id)
  if (adminCheck instanceof NextResponse) return adminCheck

  const { id } = params
  const body = await request.json().catch(() => null)
  const name = body?.name?.trim?.()

  if (!name) {
    return NextResponse.json({ error: "Role name is required" }, { status: 400 })
  }

  try {
    const updated = await db.role.update({
      where: { id },
      data: { name },
      select: { id: true, name: true, createdAt: true },
    })
    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === "P2002") {
      return NextResponse.json({ error: "Role name already exists" }, { status: 409 })
    }
    if (code === "P2025") {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }
    console.error("Update role error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/roles/[id] - delete role (admin only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await withAuth(request)
  if (auth instanceof NextResponse) return auth

  const adminCheck = await requireAdmin(auth.user.id)
  if (adminCheck instanceof NextResponse) return adminCheck

  const { id } = params

  try {
    await db.role.delete({ where: { id } })
    return NextResponse.json({ message: "Role deleted" }, { status: 200 })
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }
    console.error("Delete role error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


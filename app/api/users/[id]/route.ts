import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/middleware/auth";
import { requireAdmin } from "@/middleware/rbac";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;

  const adminCheck = await requireAdmin(auth.user.id);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const userId = params.id;

  // Prevent admins from deleting themselves
  if (auth.user.id === userId) {
    return NextResponse.json(
      { error: "Cannot delete yourself" },
      { status: 400 }
    );
  }

  // Ensure the user exists
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If the user has the admin role, ensure we won't delete the last admin
  const adminRole = await db.role.findUnique({
    where: { name: "admin" },
    select: { id: true, userRoles: { select: { userId: true } } },
  });
  if (adminRole) {
    const hasAdminRole = await db.userRole
      .findUnique({
        where: { userId_roleId: { userId, roleId: adminRole.id } },
      })
      .catch(() => null);
    if (hasAdminRole && (adminRole.userRoles?.length ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last admin" },
        { status: 400 }
      );
    }
  }

  try {
    // Remove dependent records (userRoles, editorials) before deleting user
    await db.userRole.deleteMany({ where: { userId } });
    await db.editorial.deleteMany({ where: { authorId: userId } });
    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({ message: "User deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

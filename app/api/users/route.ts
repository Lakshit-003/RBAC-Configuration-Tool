export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/middleware/auth";
import { requireAdmin } from "@/middleware/rbac";


export async function GET(request: NextRequest) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;

  const adminCheck = await requireAdmin(auth.user.id);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      createdAt: true,
      userRoles: { select: { role: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = users.map((u) => ({
    id: u.id,
    email: u.email,
    createdAt: u.createdAt,
    roles: u.userRoles.map((ur) => ur.role.name),
  }));

  return NextResponse.json({ users: formatted }, { status: 200 });
}

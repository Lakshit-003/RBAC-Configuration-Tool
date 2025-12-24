import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/middleware/auth";
import { requireAdmin } from "@/middleware/rbac";

// POST /api/roles - create role (admin only)
export async function POST(request: NextRequest) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;

  const adminCheck = await requireAdmin(auth.user.id);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const body = await request.json().catch(() => null);
  const name = body?.name?.trim?.();

  if (!name) {
    return NextResponse.json(
      { error: "Role name is required" },
      { status: 400 }
    );
  }

  try {
    const role = await db.role.create({
      data: { name },
      select: { id: true, name: true, createdAt: true },
    });
    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { error: "Role name already exists" },
        { status: 409 }
      );
    }
    console.error("Create role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/roles - list roles with permissions (admin only)
export async function GET(request: NextRequest) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;

  const adminCheck = await requireAdmin(auth.user.id);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const roles = await db.role.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      rolePermissions: {
        select: {
          permission: {
            select: {
              id: true,
              name: true,
              description: true,
              createdAt: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = roles.map((role) => ({
    id: role.id,
    name: role.name,
    createdAt: role.createdAt,
    permissions: role.rolePermissions.map((rp) => rp.permission),
  }));

  return NextResponse.json(formatted, { status: 200 });
}

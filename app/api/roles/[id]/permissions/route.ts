import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/middleware/auth";
import { requireAdmin } from "@/middleware/rbac";

// POST /api/roles/[id]/permissions - assign permission to role (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;

  const adminCheck = await requireAdmin(auth.user.id);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const roleId = params.id;
  const body = await request.json().catch(() => null);
  const permissionId = body?.permissionId;

  if (!permissionId) {
    return NextResponse.json(
      { error: "permissionId is required" },
      { status: 400 }
    );
  }

  try {
    await db.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
    });
    return NextResponse.json(
      { message: "Permission assigned to role" },
      { status: 201 }
    );
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Permission already assigned to role" },
        { status: 409 }
      );
    }
    if (code === "P2025") {
      return NextResponse.json(
        { error: "Role or permission not found" },
        { status: 404 }
      );
    }
    console.error("Assign permission to role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/roles/[id]/permissions - list permissions for a role (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;

  const adminCheck = await requireAdmin(auth.user.id);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const roleId = params.id;

  const role = await db.role.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      name: true,
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
  });

  if (!role) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const permissions = role.rolePermissions.map((rp) => rp.permission);

  return NextResponse.json(
    { role: { id: role.id, name: role.name }, permissions },
    { status: 200 }
  );
}

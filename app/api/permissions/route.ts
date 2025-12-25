import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/middleware/auth";
import { requireAdmin } from "@/middleware/rbac";

export const dynamic = "force-dynamic";

// POST /api/permissions - create permission (admin only)
export async function POST(request: NextRequest) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;

  const adminCheck = await requireAdmin(auth.user.id);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const body = await request.json().catch(() => null);
  const name = body?.name?.trim?.();
  const description = body?.description ?? null;

  if (!name) {
    return NextResponse.json(
      { error: "Permission name is required" },
      { status: 400 }
    );
  }

  try {
    const permission = await db.permission.create({
      data: { name, description },
      select: { id: true, name: true, description: true, createdAt: true },
    });
    return NextResponse.json(permission, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { error: "Permission name already exists" },
        { status: 409 }
      );
    }
    console.error("Create permission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/permissions - list permissions (admin only)
export async function GET(request: NextRequest) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;

  const adminCheck = await requireAdmin(auth.user.id);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const permissions = await db.permission.findMany({
    select: { id: true, name: true, description: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(permissions, { status: 200 });
}

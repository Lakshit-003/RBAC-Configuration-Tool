export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/middleware/auth";
import { requireAdmin } from "@/middleware/rbac";


// PUT /api/permissions/[id] - update (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;

  const adminCheck = await requireAdmin(auth.user.id);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const { id } = params;
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
    const updated = await db.permission.update({
      where: { id },
      data: { name, description },
      select: { id: true, name: true, description: true, createdAt: true },
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Permission name already exists" },
        { status: 409 }
      );
    }
    if (code === "P2025") {
      return NextResponse.json(
        { error: "Permission not found" },
        { status: 404 }
      );
    }
    console.error("Update permission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/permissions/[id] - delete (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;

  const adminCheck = await requireAdmin(auth.user.id);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const { id } = params;

  try {
    await db.permission.delete({ where: { id } });
    return NextResponse.json(
      { message: "Permission deleted" },
      { status: 200 }
    );
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json(
        { error: "Permission not found" },
        { status: 404 }
      );
    }
    console.error("Delete permission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

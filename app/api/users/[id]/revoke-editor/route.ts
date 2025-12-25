import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;

  const permCheck = await requirePermission(auth.user.id, "user:revoke:editor");
  if (permCheck instanceof NextResponse) return permCheck;

  const userId = params.id;
  const editorRole = await db.role.findUnique({ where: { name: "editor" } });
  if (!editorRole)
    return NextResponse.json(
      { error: "Editor role not found" },
      { status: 404 }
    );

  try {
    await db.userRole.delete({
      where: { userId_roleId: { userId, roleId: editorRole.id } },
    });
    return NextResponse.json(
      { message: "Editor role revoked" },
      { status: 200 }
    );
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json(
        { message: "User did not have editor role" },
        { status: 200 }
      );
    }
    console.error("Revoke editor error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

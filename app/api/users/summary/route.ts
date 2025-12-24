import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/middleware/auth";
import { requireAdmin } from "@/middleware/rbac";

export async function GET(request: NextRequest) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;

  const adminCheck = await requireAdmin(auth.user.id);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const roles = await db.role.findMany({
    select: { name: true, userRoles: { select: { userId: true } } },
  });

  const counts: Record<string, number> = {};
  for (const r of roles) {
    counts[r.name] = r.userRoles.length;
  }

  // Ensure canonical roles exist with zero when absent
  counts.admin = counts.admin || 0;
  counts.editor = counts.editor || 0;
  counts.viewer = counts.viewer || 0;

  return NextResponse.json({ counts }, { status: 200 });
}

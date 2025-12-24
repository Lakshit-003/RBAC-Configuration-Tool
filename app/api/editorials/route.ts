import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth";
import { requirePermission } from "@/middleware/rbac";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  // Require auth & journal:view permission
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;

  const perm = await requirePermission(auth.user.id, "journal:view");
  if (perm instanceof NextResponse) return perm;

  const editorials = await db.editorial.findMany({
    select: {
      id: true,
      title: true,
      content: true,
      authorId: true,
      createdAt: true,
      author: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(editorials, { status: 200 });
}

export async function POST(request: NextRequest) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  // Require journal:create permission (admin bypasses via hasPermission)
  const perm = await requirePermission(user.id, "journal:create");
  if (perm instanceof NextResponse) return perm;

  const body = await request.json();
  const title = (body.title || "").trim();
  const content = (body.content || "").trim();

  if (!title)
    return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const created = await db.editorial.create({
    data: { title, content, authorId: user.id },
  });
  return NextResponse.json(created, { status: 201 });
}

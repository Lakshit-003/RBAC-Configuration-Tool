import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth";
import { isAdmin } from "@/lib/rbac";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
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

  // Editors and Admins can create
  const admin = await isAdmin(user.id);
  // Check if user has editor role
  const roleRecords = await db.userRole.findMany({
    where: { userId: user.id },
    select: { role: { select: { name: true } } },
  });
  const roles = new Set(roleRecords.map((r) => r.role.name));
  const isEditor = roles.has("editor");

  if (!admin && !isEditor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

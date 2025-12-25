import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth";
import { hasPermission } from "@/lib/rbac";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || request.url.split("/").pop();
  const editorial = await db.editorial.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      authorId: true,
      createdAt: true,
      author: { select: { email: true } },
    },
  });
  if (!editorial)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(editorial, { status: 200 });
}

export async function PUT(request: NextRequest) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const parts = request.url.split("/");
  const id = parts[parts.length - 1];

  const editorial = await db.editorial.findUnique({ where: { id } });
  if (!editorial)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check permission: either journal:edit:any OR journal:edit:own (with ownership)
  const canEditAny = await hasPermission(user.id, "journal:edit:any");
  const canEditOwn = await hasPermission(user.id, "journal:edit:own");

  if (!canEditAny && !(canEditOwn && editorial.authorId === user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const title = (body.title || editorial.title).trim();
  const content = (body.content || editorial.content).trim();

  const updated = await db.editorial.update({
    where: { id },
    data: { title, content },
  });
  return NextResponse.json(updated, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const auth = await withAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const parts = request.url.split("/");
  const id = parts[parts.length - 1];

  const editorial = await db.editorial.findUnique({ where: { id } });
  if (!editorial)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check permission: either journal:delete:any OR journal:delete:own (with ownership)
  const canDeleteAny = await hasPermission(user.id, "journal:delete:any");
  const canDeleteOwn = await hasPermission(user.id, "journal:delete:own");

  if (!canDeleteAny && !(canDeleteOwn && editorial.authorId === user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.editorial.delete({ where: { id } });
  return NextResponse.json({ message: "Deleted" }, { status: 200 });
}

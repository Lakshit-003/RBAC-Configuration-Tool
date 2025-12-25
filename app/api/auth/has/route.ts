// export const dynamic = "force-dynamic";

// import { NextRequest, NextResponse } from "next/server";
// import { withAuth } from "@/middleware/auth";
// import { hasPermission } from "@/lib/rbac";

// export async function GET(request: NextRequest) {
//   const auth = await withAuth(request);
//   if (auth instanceof NextResponse) return auth;

//   const url = new URL(request.url);
//   const permission = url.searchParams.get("permission");
//   if (!permission) {
//     return NextResponse.json(
//       { error: "permission query param is required" },
//       { status: 400 }
//     );
//   }

//   try {
//     const allowed = await hasPermission(auth.user.id, permission);
//     return NextResponse.json({ allowed }, { status: 200 });
//   } catch (err) {
//     console.error("has permission check error:", err);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }









export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

/**
 * Get Current User API Route
 *
 * GET /api/auth/me
 *
 * Example protected route demonstrating authentication middleware usage
 * Returns the authenticated user's information
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth";

export async function GET(request: NextRequest) {
  // Use authentication middleware (typed)
  const authResult = (await withAuth(
    request
  )) as import("@/middleware/auth").AuthResult;

  // If authResult is a NextResponse, it means authentication failed
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  // Extract authenticated user from middleware result
  const { user } = authResult as {
    user: { id: string; email: string; roles?: string[] };
  };

  // Return user information including roles
  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles || [],
      },
    },
    { status: 200 }
  );
}

/**
 * Authentication Middleware
 *
 * Reusable middleware function for protecting API routes
 * Verifies JWT token and attaches authenticated user to request context
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth";
import { db } from "@/lib/db";

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    roles?: string[];
  };
}

/**
 * Authentication middleware for API routes
 *
 * Verifies JWT token from Authorization header and attaches user to request
 *
 * @param request - Next.js request object
 * @returns NextResponse with 401 if unauthorized, or null if authorized
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<{ user: { id: string; email: string } } | NextResponse> {
  // Extract token from Authorization header
  const authHeader = request.headers.get("authorization");
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized - No token provided" },
      { status: 401 }
    );
  }

  // Verify token
  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: "Unauthorized - Invalid or expired token" },
      { status: 401 }
    );
  }

  // Verify user still exists in database
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized - User not found" },
      { status: 401 }
    );
  }

  // Verify email matches (in case user was updated)
  if (user.email !== payload.email) {
    return NextResponse.json(
      { error: "Unauthorized - Token mismatch" },
      { status: 401 }
    );
  }

  // Fetch user roles to return to clients that need role information
  const roleRecords = await db.userRole.findMany({
    where: { userId: user.id },
    select: {
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  const roles = roleRecords.map((r) => r.role.name);

  return { user: { id: user.id, email: user.email, roles } };
}

/**
 * Wrapper for protected API route handlers
 *
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const authResult = await withAuth(request)
 *   if (authResult instanceof NextResponse) return authResult
 *   const { user } = authResult
 *   // Your protected route logic here
 * }
 * ```
 */
export async function withAuth(request: NextRequest) {
  return authenticateRequest(request);
}

/**
 * User Signup API Route
 *
 * POST /api/auth/signup
 *
 * Creates a new user account with email and password
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const dynamic = "force-dynamic";

const SALT_ROUNDS = 12; // Recommended bcrypt salt rounds for production

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function isValidPassword(password: string): boolean {
  // Minimum 8 characters, at least one letter and one number
  return (
    password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input presence
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters and contain both letters and numbers",
        },
        { status: 400 }
      );
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user in database
    try {
      // Create user
      const user = await db.user.create({
        data: {
          email: email.toLowerCase().trim(), // Normalize email
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
          // Explicitly exclude password from response
        },
      });

      // Enforce viewer role for all signups (server-side control)
      try {
        // Prefer role named 'viewer', fallback to 'user' if 'viewer' not present
        const viewerRole =
          (await db.role.findUnique({ where: { name: "viewer" } })) ||
          (await db.role.findUnique({ where: { name: "user" } }));
        if (viewerRole) {
          await db.userRole.create({
            data: { userId: user.id, roleId: viewerRole.id },
          });
        } else {
          console.warn(
            "Viewer/user role not found; new user was created without an assigned role."
          );
        }
      } catch (err) {
        // Log but don't fail the signup response - role assignment is best-effort
        console.error("Failed to assign viewer role to new user:", err);
      }

      return NextResponse.json(
        {
          message: "User created successfully",
          user: {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      // Handle unique constraint violation (duplicate email)
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // Unique constraint violation
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 409 } // Conflict
        );
      }

      // Re-throw unexpected errors
      throw error;
    }
  } catch (error) {
    console.error("Signup error:", error);

    // Return generic error to avoid leaking implementation details
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

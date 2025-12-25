/**
 * User Login API Route
 *
 * POST /api/auth/login
 *
 * Authenticates user with email and password, returns JWT token
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

    // Find user by email
    const user = await db.user.findUnique({
      where: {
        email: email.toLowerCase().trim(), // Normalize email
      },
      select: {
        id: true,
        email: true,
        password: true, // Need password for comparison
      },
    });

    // Don't reveal if user exists or not (security best practice)
    // Use a dummy hash comparison to prevent timing attacks
    const dummyHash = "$2b$12$dummy.hash.to.prevent.timing.attacks";
    const providedHash = user?.password || dummyHash;

    // Compare password (always perform comparison, even if user doesn't exist)
    const isPasswordValid = await bcrypt.compare(password, providedHash);

    // Check if user exists and password is valid
    if (!user || !isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    // Return token and user info (without password)
    return NextResponse.json(
      {
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);

    // Return generic error to avoid leaking implementation details
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

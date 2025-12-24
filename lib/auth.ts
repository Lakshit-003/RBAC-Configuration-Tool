/**
 * Authentication Utilities
 * 
 * JWT token generation and verification helpers
 * Used across the authentication system
 */

import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set")
}

// Type assertion: JWT_SECRET is guaranteed to be defined after the check above
const JWT_SECRET_STRING: string = JWT_SECRET

export interface JWTPayload {
  userId: string
  email: string
}

/**
 * Generate a JWT token for an authenticated user
 * 
 * @param userId - User's UUID
 * @param email - User's email address
 * @returns JWT token string
 */
export function generateToken(userId: string, email: string): string {
  const payload: JWTPayload = {
    userId,
    email,
  }

  return jwt.sign(payload, JWT_SECRET_STRING, {
    expiresIn: "7d", // Token expires in 7 days
  })
}

/**
 * Verify and decode a JWT token
 * 
 * @param token - JWT token string
 * @returns Decoded token payload or null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET_STRING) as JWTPayload
    return decoded
  } catch {
    // Token is invalid, expired, or malformed
    return null
  }
}

/**
 * Extract token from Authorization header
 * 
 * @param authHeader - Authorization header value (e.g., "Bearer <token>")
 * @returns Token string or null if not found/invalid format
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null
  }

  const parts = authHeader.split(" ")
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null
  }

  return parts[1]
}


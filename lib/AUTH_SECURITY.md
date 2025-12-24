# Authentication System Security Documentation

## Overview

This document explains the security decisions and best practices implemented in the authentication system.

## Security Features

### 1. Password Hashing

**Implementation**: bcrypt with 12 salt rounds

**Why 12 rounds?**

- Industry standard for production applications
- Balance between security and performance
- Each round doubles the computation time, making brute-force attacks exponentially harder
- 12 rounds = ~300ms hash time (acceptable for user experience)

**Security Benefits**:

- Passwords are never stored in plain text
- Even with database access, passwords cannot be reversed
- Salt is automatically generated per password (unique hashes for same password)

### 2. JWT Token Security

**Token Expiration**: 7 days

**Why 7 days?**

- Balance between security and user experience
- Reduces token theft window
- Users don't need to re-authenticate too frequently
- Can be adjusted based on security requirements

**JWT Payload**:

```typescript
{
  userId: string,  // UUID for user identification
  email: string     // Email for verification
}
```

**Security Considerations**:

- No sensitive data in token (only userId and email)
- Token is signed with JWT_SECRET (never exposed)
- Token verification includes database check (user must still exist)

### 3. Input Validation

**Email Validation**:

- Format validation using regex
- Normalization (lowercase, trim)
- Prevents invalid email formats

**Password Validation**:

## Default Admin Bootstrap

To bootstrap a default admin (safe & idempotent), set the following environment variables before running the seed script:

```bash
# Local example - DO NOT COMMIT
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=Admin@1234
```

If both variables are set, running `npm run db:seed` will create or update the admin account and assign it the `admin` role. This logic is idempotent and safe to run multiple times.

## Default Role for New Users

All new users created via `POST /api/auth/signup` are automatically assigned a server-controlled `viewer` role (fallbacks to `user` if `viewer` role is not present). The signup API ignores any role input from clients and will assign roles only on the server-side to prevent privilege escalation.

- Minimum 8 characters
- Must contain at least one letter
- Must contain at least one number
- Prevents weak passwords

**Why These Rules?**

- Prevents common weak passwords
- Reduces brute-force attack surface
- Can be extended with more complex rules if needed

### 4. Error Handling Security

**Generic Error Messages**:

- "Invalid email or password" (doesn't reveal if email exists)
- "Internal server error" (doesn't leak implementation details)
- Prevents user enumeration attacks
- Prevents information disclosure

**Timing Attack Prevention**:

- Always performs bcrypt comparison, even for non-existent users
- Uses dummy hash to maintain consistent timing
- Prevents attackers from determining if email exists based on response time

### 5. Database Security

**Unique Constraints**:

- Email uniqueness enforced at database level
- Prevents duplicate accounts
- Returns 409 Conflict for duplicate emails

**User Verification**:

- Middleware verifies user still exists in database
- Verifies email matches token (handles email changes)
- Prevents use of tokens for deleted users

### 6. Token Extraction

**Authorization Header Format**:

```
Authorization: Bearer <token>
```

**Validation**:

- Checks for "Bearer" prefix
- Validates token format
- Returns 401 if malformed

## API Endpoints

### POST /api/auth/signup

**Request Body**:

```json
{
  "email": "admin@example.com",
  "password": "Admin@1234"
}
```

**Success Response (201)**:

```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses**:

- `400`: Missing or invalid input
- `409`: Email already exists
- `500`: Internal server error

**Security Notes**:

- Password is never returned in response
- Email is normalized before storage
- Password is hashed before storage

### POST /api/auth/login

**Request Body**:

```json
{
  "email": "admin@example.com",
  "password": "Admin@1234"
}
```

**Success Response (200)**:

```json
{
  "message": "Login successful",
  "token": "jwt.token.here",
  "user": {
    "id": "uuid",
    "email": "admin@example.com"
  }
}
```

**Error Responses**:

- `400`: Missing email or password
- `401`: Invalid credentials
- `500`: Internal server error

**Security Notes**:

- Generic error message prevents user enumeration
- Timing attack prevention (constant-time comparison)
- Token expires in 7 days

### GET /api/auth/me (Protected)

**Headers Required**:

```
Authorization: Bearer <token>
```

**Success Response (200)**:

```json
{
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "roles": ["admin", "editor"]
  }
}
```

**Error Responses**:

- `401`: Unauthorized (no token, invalid token, or expired token)

**Security Notes**:

- Requires valid JWT token
- Verifies user still exists in database
- Verifies email matches token

## Authentication Middleware

### Usage in Protected Routes

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/middleware/auth";

export async function GET(request: NextRequest) {
  // Authenticate request
  const authResult = await withAuth(request);

  // Check if authentication failed
  if (authResult instanceof NextResponse) {
    return authResult; // Returns 401 response
  }

  // Extract authenticated user
  const { user } = authResult;

  // Use user.id and user.email in your route logic
  // ...
}
```

## Security Best Practices Implemented

✅ **Password Hashing**: bcrypt with 12 salt rounds  
✅ **JWT Tokens**: Signed with secret, 7-day expiration  
✅ **Input Validation**: Email format and password strength  
✅ **Error Handling**: Generic messages, no information leakage  
✅ **Timing Attack Prevention**: Constant-time password comparison  
✅ **User Enumeration Prevention**: Generic error messages  
✅ **Token Verification**: Database check on every request  
✅ **Email Normalization**: Consistent storage format  
✅ **Type Safety**: TypeScript for compile-time checks  
✅ **No Password Leakage**: Passwords never returned in responses

## Environment Variables

Required environment variables:

```env
DATABASE_URL="mysql://user:password@host:3306/database"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
```

**JWT_SECRET Security**:

- Must be a strong, random string
- Minimum 32 characters recommended
- Generate using: `openssl rand -base64 32`
- Never commit to version control
- Different for each environment (dev, staging, production)

## Future Enhancements (Not Implemented)

These are intentionally not implemented in this step but can be added later:

- Refresh tokens for longer sessions
- Rate limiting on login attempts
- Account lockout after failed attempts
- Email verification
- Password reset functionality
- Two-factor authentication (2FA)
- Token blacklisting for logout
- Cookie-based token storage (more secure than localStorage)

## Testing the Authentication System

### 1. Signup

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

### 3. Get Current User (Protected)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Conclusion

This authentication system provides a secure foundation for the RBAC system. All security best practices are followed, and the code is structured to easily extend with RBAC permissions in the next step.

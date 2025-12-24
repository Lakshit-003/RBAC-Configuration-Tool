# Project Setup Documentation

## Overview

This document explains the foundation setup for the RBAC Configuration Tool, including architectural decisions and folder structure rationale.

## Folder Structure

```
RBAC/
├── app/                          # Next.js App Router directory
│   ├── (auth)/                   # Route group for authentication pages
│   │   ├── login/
│   │   │   └── page.tsx         # Login page placeholder
│   │   └── signup/
│   │       └── page.tsx         # Signup page placeholder
│   ├── (dashboard)/              # Route group for protected admin area
│   │   ├── layout.tsx           # Dashboard layout wrapper
│   │   └── page.tsx             # Dashboard page placeholder
│   ├── api/                      # Backend API routes (empty for now)
│   ├── layout.tsx               # Root layout with metadata
│   └── page.tsx                 # Home page with Button example
├── components/                   # Reusable UI components
│   └── ui/
│       └── button.tsx           # shadcn/ui Button component
├── lib/                          # Utility functions and helpers
│   ├── constants.ts             # Application-wide constants
│   └── utils.ts                 # Utility functions (cn helper)
├── types/                        # Global TypeScript type definitions
│   └── index.ts                 # Centralized type exports
├── styles/                       # Global styles
│   └── globals.css              # Tailwind CSS + shadcn/ui variables
├── middleware.ts                 # Next.js middleware (auth/RBAC placeholder)
├── components.json               # shadcn/ui configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── next.config.js                # Next.js configuration
├── .eslintrc.json               # ESLint configuration
├── .gitignore                   # Git ignore rules
├── .env.example                 # Environment variables template
└── package.json                 # Dependencies and scripts
```

## Key Setup Decisions

### 1. Next.js App Router

**Why**: The App Router is the modern, recommended approach for Next.js 13+ applications. It provides:

- Better performance with React Server Components
- Improved routing with route groups and layouts
- Built-in support for streaming and suspense
- Better TypeScript integration

### 2. Route Groups `(auth)` and `(dashboard)`

**Why**: Route groups allow logical organization without affecting URL structure:

- `(auth)` groups login/signup pages together
- `(dashboard)` groups protected admin pages
- Enables shared layouts per group
- URLs remain clean: `/login`, `/signup`, `/dashboard`

### 3. Absolute Imports (`@/*`)

**Why**: Improves code maintainability:

- No relative path confusion (`../../../components`)
- Easier refactoring
- Better IDE autocomplete
- Consistent import patterns across the codebase

### 4. shadcn/ui + Tailwind CSS

**Why**: Modern, flexible UI system:

- shadcn/ui provides copy-paste components (not a dependency)
- Tailwind CSS for utility-first styling
- Full customization control
- Dark mode support built-in
- Production-ready component patterns

### 5. TypeScript Strict Mode

**Why**: Catches errors early and improves code quality:

- Type safety prevents runtime errors
- Better IDE support and autocomplete
- Self-documenting code
- Easier refactoring

### 6. ESLint Configuration

**Why**: Enforces code quality:

- Next.js recommended rules
- TypeScript-specific rules
- Prevents common mistakes
- Consistent code style

### 7. Environment Variables

**Why**: Security and configuration management:

- `.env.example` documents required variables
- `.env` in `.gitignore` prevents secret leaks
- MySQL connection string format documented
- JWT secret placeholder for future auth

### 8. Middleware Placeholder

**Why**: Prepared for authentication:

- Next.js middleware runs on every request
- Perfect for auth checks and RBAC
- Matcher configured to exclude static assets
- Ready for JWT validation logic

## Configuration Files Explained

### `tsconfig.json`

- Strict TypeScript mode enabled
- Path aliases configured (`@/*`)
- Next.js plugin included
- ES2017 target for modern JavaScript

### `tailwind.config.ts`

- shadcn/ui theme variables configured
- Dark mode support via CSS variables
- Container utilities for responsive layouts
- Custom animations for accordion components

### `next.config.js`

- React Strict Mode enabled
- SWC minification for faster builds
- Production-ready defaults

### `.eslintrc.json`

- Extends Next.js core web vitals rules
- TypeScript-specific linting
- Unused variable warnings (with ignore patterns)
- Any type warnings (not errors, for flexibility)

## Dependencies

### Production

- `next`: Next.js framework
- `react` & `react-dom`: React library
- `clsx`: Conditional class names
- `tailwind-merge`: Merge Tailwind classes intelligently
- `class-variance-authority`: Component variant management

### Development

- `typescript`: Type checking
- `eslint` & `eslint-config-next`: Code linting
- `tailwindcss`: Utility-first CSS framework
- `postcss` & `autoprefixer`: CSS processing
- `tailwindcss-animate`: Animation utilities

## Verification

The project has been verified to:

- ✅ Build successfully (`npm run build`)
- ✅ Pass TypeScript type checking
- ✅ Pass ESLint validation
- ✅ Include all required folder structure
- ✅ Have proper environment configuration
- ✅ Include shadcn/ui Button component example

### Running the smoke test

Run the automated smoke test (ensure dev server is running):

```bash
# Default is http://localhost:3000 (Next may pick 3001 if 3000 is in use)
BASE_URL=http://localhost:3000 npm run test:smoke
```

### Admin bootstrap and smoke-admin checks 🔧

You can create a dev admin automatically when running the seed script by setting the following environment variables before running `db:seed`:

- `ADMIN_EMAIL` (e.g. `admin@gmail.com`)
- `ADMIN_PASSWORD` (e.g. `Admin@1234`)

When both are present, `npm run db:seed` will idempotently create the admin user (or update the existing user) and assign the `admin` role.

We also provide an extended smoke test to validate admin flows (login, list users, grant/revoke editor role, role ⇄ permission mapping, and editorial ownership enforcement):

```bash
# Requires the dev server to be running and ADMIN_EMAIL/ADMIN_PASSWORD set to the admin created by the seed
BASE_URL=http://localhost:3000 ADMIN_EMAIL=admin@gmail.com ADMIN_PASSWORD=Admin@1234 npm run test:smoke-admin
```

### Creating an admin user (manual / dev only)

If you prefer, you can assign admin role via Prisma Studio or directly in the DB instead of using the seed env variables:

1. Open Prisma Studio:

```bash
npx prisma studio
```

2. Locate that user's record in the `User` table, and associate the `Role` (create a `role` record named `admin` if it doesn't exist), and add a `UserRole` mapping.

Or run an SQL statement (replace ids appropriately):

```sql
INSERT INTO role (name, created_at) VALUES ('admin', NOW());
INSERT INTO user_role (user_id, role_id) VALUES ('<user-id>', '<role-id>');
```

> NOTE: Role and mapping table names may vary depending on your Prisma schema. Use `npx prisma studio` or `prisma schema` to confirm table names.

## Next Steps

This foundation is ready for:

1. Prisma schema definition
2. Database connection setup
3. Authentication implementation (JWT)
4. RBAC logic implementation
5. API route development

## Running the Project

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your actual values

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

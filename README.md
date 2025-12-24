# RBAC Configuration Tool

A full-stack Role-Based Access Control (RBAC) Configuration Tool built with Next.js, TypeScript, Prisma, and MySQL.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: MySQL
- **Authentication**: JWT (to be implemented)
- **UI**: shadcn/ui + Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   - The `.env` file has been created with placeholder values
   - Update `.env` with your actual MySQL database credentials:
     ```env
     DATABASE_URL="mysql://USERNAME:PASSWORD@HOST:3306/DATABASE_NAME"
     ```
   - Example for local MySQL:
     ```env
     DATABASE_URL="mysql://root:yourpassword@localhost:3306/rbac_db"
     ```
   - Generate a secure JWT_SECRET (e.g., `openssl rand -base64 32`)

4. Set up the database:

   ```bash
   # Create the database (if it doesn't exist)
   # Connect to MySQL and run: CREATE DATABASE rbac_db;

   # Run Prisma migrations
   npx prisma migrate dev --name init

   # Generate Prisma Client
   npx prisma generate
   ```

5. Run the development server:

   ```bash
   # default: runs on available port (e.g., 3001 if 3000 is in use)
   npm run dev

   # or force port 3000 explicitly
   npm run dev:3000
   ```

6. Open http://localhost:3000 (or the port Next printed in the console) in your browser

## Project Structure

```
/app
  /(auth)          # Authentication pages (login/signup)
  /(dashboard)     # Protected admin area
  /api             # Backend API routes
/components        # Reusable UI components
/lib               # Utilities (db, auth, constants)
/types             # Global TypeScript types
/middleware        # Auth & RBAC middleware
/styles            # Global styles
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Testing & Verification

Automated smoke test (requires the dev server to be running):

```bash
# Default URL is http://localhost:3000 - adjust BASE_URL if Next picks a different port (e.g. 3001)
BASE_URL=http://localhost:3000 npm run test:smoke
```

Manual verification checklist (short):

1. Start the dev server: `npm run dev` and open http://localhost:3000 (or the port Next outputs).
2. Visit **Log in** and **Sign up** from the landing page and confirm the pages render.
3. Create an account using **Sign up**, then sign in and confirm you see a success toast and are redirected to `/dashboard`.
4. The `/api/auth/me` endpoint now returns a `roles` array for the authenticated user; on `/dashboard`, confirm the sidebar shows **Content** for all roles, and **Permissions / Roles / Role-Permission Mapping** appear for admin users only.
5. Use the dev debug controls on the auth pages (visible in non-production) to clear `localStorage.token` or disable the automatic redirect during testing.
6. Verify the **Logout** button clears the token and redirects to `/login`.

For a full step-by-step manual checklist, see `TESTING.md`.

## Database Commands

- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database (dev only)
- `npm run db:migrate` - Create and apply migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)

## License

Private - Internal Use Only

# RBAC Configuration Tool

A full-stack Role-Based Access Control (RBAC) Configuration Tool built with Next.js, TypeScript, Prisma, and MySQL.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: MySQL
- **Authentication**: JWT (to be implemented)
- **UI**: shadcn/ui + Tailwind CSS
- **Deployment**: Frontend & Backend on **Render**, Database on **Railway (MySQL)**

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

## Database Commands

- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database (dev only)
- `npm run db:migrate` - Create and apply migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)

## RBAC Explanation for a Kid 
**RBAC (Role-Based Access Control)** means everyone has a role, like a teacher or a student. Each role decides what you can do. Some people can change things like Teachers, some can only see them like students. This keeps the app safe and organized.

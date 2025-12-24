# Manual Verification Checklist

This document describes the manual steps to verify the RBAC frontend wiring and role-based behavior.

Prerequisites

- Dev server running: `npm run dev`
- Browser open at http://localhost:3000 (or the port Next assigns, e.g., 3001)

Quick smoke tests

1. Landing page
   - Open the root URL and confirm **Log in** and **Sign up** buttons are visible.
2. Auth pages
   - Visit `/signup`, create an account.
   - Sign in at `/login` and confirm a success toast appears and you are redirected to `/dashboard`.
   - If you auto-redirect, use the **Dev: token debug** controls on the auth pages to clear token or disable redirect.
3. Dashboard access
   - With a signed-in user you should land on `/dashboard` and see the sidebar.
   - All users should see **Content**.
   - Admin users should see **Permissions**, **Roles**, and **Role-Permission Mapping** links.
4. Content behavior
   - Visit `/dashboard/content`.
   - Editors and Admins should be able to create and edit placeholder posts.
   - Viewers should see content read-only; create/edit buttons not present.
5. Logout
   - Click **Logout** and confirm `localStorage.token` is cleared and you are redirected to `/login`.

Advanced tests (API-level smoke)

- Run the included smoke script to verify API endpoints (requires server running):

```bash
BASE_URL=http://localhost:3000 npm run test:smoke
```

Troubleshooting

- If pages auto-redirect to `/dashboard` when you expect to see `/login`, open DevTools Console and run:

```js
localStorage.removeItem("token");
location.reload();
```

- If backend APIs fail (4xx/5xx), check your `.env` database configuration and ensure Prisma migrations have been applied.

Developer tips

- Use `npx prisma studio` to inspect and modify roles and user mappings during testing.
- The temporary debug controls appear only in non-production builds (NODE_ENV !== 'production').

Document any failures or unexpected behaviors and add them to issues for follow-up.

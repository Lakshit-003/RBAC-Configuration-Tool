"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{
    id: string;
    email: string;
    roles?: string[];
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const router = useRouter();

  const pathname = usePathname();

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const data = await apiFetch<{
          user: { id: string; email: string; roles?: string[] };
        }>("/api/auth/me");
        setUser(data.user);

        // Use roles returned from /api/auth/me when available to shortcut checks
        const roles: string[] = data.user.roles || [];
        setIsAdmin(roles.includes("admin"));

        // If user has 'editor' role assume edit access, otherwise probe protected endpoint
        if (roles.includes("editor")) {
          setCanEdit(true);
        } else {
          const editOk = await apiFetch("/api/protected-example", {
            method: "POST",
          })
            .then(() => true)
            .catch(() => false);
          setCanEdit(editOk);
        }
      } catch (err) {
        // token invalid or other error - force sign out
        console.error(err);
        localStorage.removeItem("token");
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // If the current page is the dashboard root and the user is a viewer-only,
  // redirect them to the dashboard content page for a better UX.
  useEffect(() => {
    if (!loading && !isAdmin && !canEdit && pathname === "/dashboard") {
      router.replace("/dashboard/content");
    }
  }, [loading, isAdmin, canEdit, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r bg-card">
        <div className="px-4 py-6">
          <h2 className="text-xl font-semibold">RBAC Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Manage roles & permissions
          </p>
        </div>

        <nav className="space-y-1 px-2">
          {/** Viewer-only users: show only the Content link for a simplified sidebar */}
          {!isAdmin && !canEdit ? (
            <NavLink href="/dashboard/content" label="Content" />
          ) : (
            <>
              <NavLink href="/dashboard" label="Overview" />
              <NavLink href="/dashboard/content" label="Content" />
              {isAdmin && (
                <>
                  <NavLink href="/dashboard/users" label="Users" />
                  <NavLink href="/dashboard/permissions" label="Permissions" />
                  <NavLink href="/dashboard/roles" label="Roles" />
                  <NavLink
                    href="/dashboard/role-permissions"
                    label="Role-Permission Mapping"
                  />
                </>
              )}
            </>
          )}
        </nav>

        <div className="mt-6 px-4">
          <div className="text-xs text-muted-foreground">Signed in as</div>
          <div className="font-medium break-all">
            {user?.email ?? "(unknown)"}
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage roles & permissions
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <div className="text-sm text-muted-foreground">Admin access</div>
            ) : canEdit ? (
              <div className="text-sm text-muted-foreground">Editor access</div>
            ) : (
              <div className="text-sm text-muted-foreground">Viewer</div>
            )}

            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem("token");
                router.replace("/login");
              }}
            >
              Logout
            </Button>
          </div>
        </header>

        <main className="container mx-auto flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
    >
      {label}
    </Link>
  );
}

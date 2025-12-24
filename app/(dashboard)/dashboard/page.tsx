"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function DashboardPage() {
  const [counts, setCounts] = useState<{
    admin: number;
    editor: number;
    viewer: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch<{
          counts: { admin: number; editor: number; viewer: number };
        }>("/api/users/summary");
        if (!mounted) return;
        setCounts(res.counts);
      } catch (err) {
        // If not admin or other error, show nothing but log
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">
          This is the dashboard overview. Use the sidebar to access content and
          RBAC management tools.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-semibold">User counts</h3>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="text-sm text-muted-foreground">
            Summary unavailable
          </div>
        ) : counts ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-md border bg-card p-4 text-center">
              <div className="text-sm text-muted-foreground">Admins</div>
              <div className="text-2xl font-bold">{counts.admin}</div>
            </div>
            <div className="rounded-md border bg-card p-4 text-center">
              <div className="text-sm text-muted-foreground">Editors</div>
              <div className="text-2xl font-bold">{counts.editor}</div>
            </div>
            <div className="rounded-md border bg-card p-4 text-center">
              <div className="text-sm text-muted-foreground">Viewers</div>
              <div className="text-2xl font-bold">{counts.viewer}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No data</div>
        )}
      </div>
    </div>
  );
}

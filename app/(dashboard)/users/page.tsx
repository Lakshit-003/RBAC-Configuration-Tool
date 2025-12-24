"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

type UserItem = { id: string; email: string; roles: string[] };

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    // load current user id and users list
    (async () => {
      try {
        const me = await apiFetch<{ user: { id: string } }>("/api/auth/me");
        setMeId(me.user.id);
      } catch (err) {
        // ignore - user may not be admin
      }
      await loadUsers();
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ users: UserItem[] }>("/api/users");
      setUsers(data.users);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load users";
      if (/403|Forbidden/i.test(msg)) {
        router.replace("/dashboard");
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function grant(userId: string) {
    setBusyId(userId);
    try {
      await apiFetch(`/api/users/${userId}/grant-editor`, { method: "POST" });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Grant failed");
    } finally {
      setBusyId(null);
    }
  }

  async function revoke(userId: string) {
    setBusyId(userId);
    try {
      await apiFetch(`/api/users/${userId}/revoke-editor`, { method: "POST" });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage application users
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading users...</div>
      ) : (
        <div className="rounded-md border bg-card">
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-sm">Email</th>
                <th className="px-4 py-2 text-sm">Roles</th>
                <th className="px-4 py-2 text-sm">Actions</th>
                <th className="px-4 py-2 text-sm">Delete</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="odd:bg-muted">
                  <td className="px-4 py-2 text-sm">{u.email}</td>
                  <td className="px-4 py-2 text-sm">{u.roles.join(", ")}</td>
                  <td className="px-4 py-2 text-sm">
                    {u.roles.includes("editor") ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => revoke(u.id)}
                        disabled={busyId === u.id || deletingId === u.id}
                      >
                        {busyId === u.id ? "Working..." : "Revoke Editor"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => grant(u.id)}
                        disabled={busyId === u.id || deletingId === u.id}
                      >
                        {busyId === u.id ? "Working..." : "Grant Editor"}
                      </Button>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {u.id === meId ? (
                      <div className="text-xs text-muted-foreground">You</div>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteUser(u.id)}
                        disabled={busyId === u.id || deletingId === u.id}
                      >
                        {deletingId === u.id ? "Deleting..." : "Delete"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  async function deleteUser(userId: string) {
    if (!confirm("Delete this user? This action cannot be undone.")) return;
    setDeletingId(userId);
    try {
      await apiFetch(`/api/users/${userId}`, { method: "DELETE" });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }
}
